import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { Button } from '../ui/button';
import { X, Check, AlertTriangle, CheckCircle, RotateCcw, Sparkles, Eye, EyeOff, ChevronDown, Minimize2, Move, XCircle, Zap, BookOpen, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import "katex/dist/katex.min.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import confetti from 'canvas-confetti';
import { OverlayPositionManager, type OverlayPosition, type EditorBounds } from '../../services/overlayPositionManager';
import { EditorBoundsCalculator, type MonacoEditor } from '../../services/editorBoundsCalculator';

// Blurred section component with click-to-reveal
const BlurredSection: React.FC<{ content: string; label?: string; icon?: React.ReactNode; className?: string }> = ({ content, label = "Hint", icon = "💡", className }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div
      className={`relative cursor-pointer text-xs text-muted-foreground p-2 rounded-md border-l-4 ${className || "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-600"}`}
      onClick={(e) => {
        e.stopPropagation();
        setIsRevealed(!isRevealed);
      }}
    >
      <div className="flex items-center gap-2">
        {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        <span className="text-xs font-medium">
          {isRevealed ? `Hide ${label}` : `Click to reveal ${label}`}
        </span>
      </div>
      {isRevealed ? (
        <div className="mt-2 text-foreground whitespace-pre-wrap">
          <span className="mr-1">{icon}</span>{content}
        </div>
      ) : (
        <div className="mt-2 select-none filter blur-sm text-muted-foreground text-xs">
          This {label.toLowerCase()} will help guide you to the solution...
        </div>
      )}
    </div>
  );
};

interface SimpleOverlayProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onValidateCode: (explanation?: string) => void;
  onCancel: () => void;
  onExitCoach?: () => void;
  onFinishCoaching?: () => void;
  onInsertCorrectCode?: () => Promise<void> | void; // New prop for inserting correct code
  onStartOptimization?: (type: 'optimization' | 'alternative') => void; // Trigger optimization or alternative flow
  isValidating?: boolean;
  hasError?: boolean;
  // Offer optimization action when session is completed and optimization is available
  isOptimizable?: boolean;
  // Coaching specific props
  question?: string;
  hint?: string;
  stepInfo?: { current: number; total: number };
  isSessionCompleted?: boolean; // NEW: Track if session is completed
  // Validation feedback
  validationResult?: {
    isCorrect: boolean;
    feedback: string;
    isOptimizable?: boolean;
    hasAlternative?: boolean;
    codeToAdd?: string; // Available corrected code
    nextStep?: {
      question: string;
      hint: string;
    };
    optimizationAnalysis?: {
      optimizationType?: 'time' | 'space' | 'both' | 'alternative';
      currentComplexity?: { time: string; space: string };
      targetComplexity?: { time: string; space: string };
      reason?: string;
    };
  } | null;
  // Enhanced positioning with OverlayPositionManager
  highlightedLine?: number;
  editorHeight?: number;
  // Monaco editor reference for coordinate transformation
  editorRef?: React.RefObject<{
    getDomNode?: () => HTMLElement | null;
    getScrollTop?: () => number;
    getPosition?: () => { lineNumber: number; column: number } | null;
  } | null>;
  // Enhanced positioning system props
  positionManager?: OverlayPositionManager; // Centralized positioning manager
  problemId?: string; // Required for position persistence when using positionManager
  onPositionChange?: (pos: { x: number; y: number }) => void; // Persist user position (callback for parent)
}

const SimpleOverlay: React.FC<SimpleOverlayProps> = ({
  isVisible,
  position,
  onValidateCode,
  onCancel,
  onExitCoach,
  onFinishCoaching,
  onInsertCorrectCode,
  isValidating = false,
  hasError = false,
  question,
  hint,
  stepInfo,
  isSessionCompleted = false,
  validationResult,
  highlightedLine,
  editorHeight,
  editorRef,
  onStartOptimization,
  onPositionChange,
  isOptimizable,
  positionManager,
  problemId,
}) => {
  type PositionPreset = 'auto' | 'center' | 'center-bottom' | 'left-top' | 'right-top' | 'right-bottom' | 'left-bottom' | 'custom';
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [customPosition, setCustomPosition] = useState<{ x: number; y: number } | null>(null);
  const [studentExplanation, setStudentExplanation] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [positionPreset, setPositionPreset] = useState<PositionPreset>('auto');
  const overlayRef = useRef<HTMLDivElement>(null);

  // Debug logger (enable via localStorage key: coach_overlay_debug = '1')
  const logDebug = useCallback((...args: unknown[]) => {
    try {
      if (localStorage.getItem('coach_overlay_debug') === '1') {
        logger.debug("[COACH][overlay]", { component: "SimpleOverlay", args });
      }
    } catch {
      void 0; // ignore
    }
  }, []);

  // Initialize EditorBoundsCalculator
  const editorBoundsCalculator = useMemo(() => new EditorBoundsCalculator({
    padding: { top: 5, right: 5, bottom: 5, left: 5 },
    minWidth: 200,
    minHeight: 150,
  }), []);

  // Responsive positioning state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Initialize editor bounds calculator when editor reference is available
  useEffect(() => {
    if (editorRef?.current && editorBoundsCalculator) {
      try {
        // Cast the editor reference to MonacoEditor interface
        const monacoEditor = editorRef.current as MonacoEditor;
        editorBoundsCalculator.initialize(monacoEditor);

        // Set up bounds change listener for automatic position updates
        const unsubscribe = editorBoundsCalculator.onBoundsChange((bounds) => {
          // Only update position if we don't have a custom position set by user
          if (!customPosition && positionManager && problemId) {
            const newPosition = positionManager.getPositionWithFallback(bounds, highlightedLine);
            setCustomPosition({ x: newPosition.x, y: newPosition.y });
          }
        });

        return () => {
          unsubscribe();
          editorBoundsCalculator.cleanup();
        };
      } catch (error) {
        logger.warn("Failed to initialize editor bounds calculator", { component: "SimpleOverlay", error });
      }
    }
  }, [editorRef, editorBoundsCalculator, customPosition, positionManager, problemId, highlightedLine]);

  // Helper function to get editor bounds using the calculator with fallback
  const getEditorBounds = useCallback((): EditorBounds | null => {
    // Try using the bounds calculator first
    if (editorBoundsCalculator) {
      try {
        const bounds = editorBoundsCalculator.getEditorBounds();
        if (bounds && editorBoundsCalculator.areBoundsValid(bounds)) {
          return bounds;
        }
      } catch (error) {
        logger.warn("EditorBoundsCalculator failed", { component: "SimpleOverlay", error });
      }
    }

    // Fallback to manual calculation if calculator fails
    try {
      const editorDom = editorRef?.current?.getDomNode?.();
      if (!editorDom) {
        logger.warn("Editor DOM node not available for bounds calculation", { component: "SimpleOverlay" });
        return null;
      }

      const editorRect = editorDom.getBoundingClientRect();

      if (!editorRect || editorRect.width === 0 || editorRect.height === 0) {
        logger.warn("Invalid editor rect dimensions", { component: "SimpleOverlay" });
        return null;
      }

      return {
        left: editorRect.left,
        top: editorRect.top,
        right: editorRect.right,
        bottom: editorRect.bottom,
        width: editorRect.width,
        height: editorRect.height,
      };
    } catch (error) {
      logger.warn("Manual editor bounds calculation failed", { component: "SimpleOverlay", error });
      return null;
    }
  }, [editorBoundsCalculator, editorRef]);

  // Load and persist position preset preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('coach_overlay_position_preset') as PositionPreset | null;
      if (saved) {
        setPositionPreset(saved);
      } else {
        // Default to center for predictable first render
        setPositionPreset('center');
      }
    } catch {
      // ignore
    }
  }, []);

  const applyPreset = useCallback((preset: PositionPreset) => {
    logDebug('applyPreset', preset);
    setPositionPreset(preset);
    try { localStorage.setItem('coach_overlay_position_preset', preset); } catch { void 0; }
    if (preset !== 'custom') {
      setCustomPosition(null);
    }
  }, []);

  const getPresetPosition = useCallback((preset: PositionPreset) => {
    const viewportW = window.innerWidth || 1280;
    const viewportH = window.innerHeight || 720;
    // Measure actual overlay size if possible for accurate placement
    const rect = overlayRef.current?.getBoundingClientRect();
    const w = rect?.width || (isMobile ? Math.min(viewportW - 32, 500) : 500);
    const h = rect?.height || 300;
    const margin = 24;

    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

    let x = (viewportW - w) / 2;
    let y = (viewportH - h) / 2;

    switch (preset) {
      case 'center':
        break;
      case 'center-bottom':
        y = viewportH - h - margin;
        break;
      case 'left-top':
        x = margin; y = margin; break;
      case 'right-top':
        x = viewportW - w - margin; y = margin; break;
      case 'right-bottom':
        x = viewportW - w - margin; y = viewportH - h - margin; break;
      case 'left-bottom':
        x = margin; y = viewportH - h - margin; break;
      default:
        break;
    }

    const final = { x: clamp(Math.round(x), margin, Math.max(margin, viewportW - w - margin)), y: clamp(Math.round(y), margin, Math.max(margin, viewportH - h - margin)) };
    logDebug('getPresetPosition', { preset, viewportW, viewportH, w, h, final });
    return final;
  }, [isMobile]);

  // Recompute and set a concrete position when preset changes
  useEffect(() => {
    if (positionPreset === 'auto') {
      // Let smart positioning manage it
      setCustomPosition(null);
      return;
    }
    if (positionPreset === 'custom') {
      // Keep user's dragged position
      return;
    }
    // Compute after layout to get accurate dimensions
    const raf = requestAnimationFrame(() => {
      const p = getPresetPosition(positionPreset);
      logDebug('preset effect -> setCustomPosition', positionPreset, p);
      setCustomPosition(p);
    });
    return () => cancelAnimationFrame(raf);
  }, [positionPreset, getPresetPosition]);

  // Centralized overlay state management for cleaner UI logic
  const overlayState = useMemo(() => {
    if (isSessionCompleted) return 'completed';
    if (isValidating) return 'validating';
    if (validationResult?.isCorrect) return 'correct';
    if (validationResult && !validationResult.isCorrect) return 'incorrect';
    return 'initial';
  }, [isSessionCompleted, isValidating, validationResult]);

  // Enhanced question rendering logic with proper state checks
  const shouldShowQuestion = useMemo(() => {
    // Never show questions when session is completed
    if (isSessionCompleted) return false;
    // Never show questions during validation
    if (isValidating) return false;
    // Never show questions if validation shows problem is solved or if there's a next step
    if (validationResult?.isCorrect && (validationResult.nextStep?.question || validationResult.nextStep?.hint)) return false;
    // Show question only if we have one and session is active
    return Boolean(question && question.trim() !== '' && !isSessionCompleted);
  }, [isSessionCompleted, isValidating, question, validationResult]);

  // Reset state when overlay is hidden
  // NOTE: We DON'T reset customPosition here to preserve user's drag position
  useEffect(() => {
    if (!isVisible) {
      setIsMinimized(false);
      // Don't reset customPosition - preserve user's manual positioning
      setStudentExplanation("");
      setShowTextInput(false);
    }
  }, [isVisible]);

  // Load saved position when overlay becomes visible (AUTO mode only)
  useEffect(() => {
    if (positionPreset !== 'auto') return; // Only auto uses manager persistence
    // Only load position if we don't already have one (first time showing overlay)
    if (isVisible && positionManager && problemId && !customPosition) {
      try {
        // Get current editor bounds using the calculator
        const editorBounds = getEditorBounds();

        if (editorBounds) {
          // Use OverlayPositionManager's comprehensive position resolution
          const resolvedPosition = positionManager.getPositionWithFallback(editorBounds, highlightedLine);

          setCustomPosition({ x: resolvedPosition.x, y: resolvedPosition.y });
          logger.debug("Loaded resolved position", { component: "SimpleOverlay", resolvedPosition });
        } else {
          // Use viewport fallback when editor bounds unavailable
          const fallbackPosition = positionManager.getPositionWithFallback();
          setCustomPosition({ x: fallbackPosition.x, y: fallbackPosition.y });
          logger.debug("Loaded fallback position", { component: "SimpleOverlay", fallbackPosition });
        }
      } catch (error) {
        logger.warn("Failed to load position, using default", { component: "SimpleOverlay", error });
        // Don't set customPosition to allow getSmartPosition to handle fallback
      }
    }
  }, [isVisible, positionPreset, positionManager, problemId, highlightedLine, getEditorBounds]); // Removed customPosition from deps to prevent re-triggering

  // Handle responsive positioning on window resize
  // Only update mobile state, don't force position recalculation on resize
  useEffect(() => {
    const handleResize = () => {
      // Use OverlayPositionManager's device detection if available
      const newIsMobile = positionManager
        ? positionManager.getDeviceType() === 'mobile'
        : window.innerWidth < 768;

      setIsMobile(newIsMobile);

      // Don't automatically recalculate position on resize - let user's drag position persist
      // The overlay will naturally constrain itself if it goes out of bounds via getSmartPosition
    };

    // Debounce resize events to avoid excessive recalculations
    let resizeTimeout: NodeJS.Timeout;
    const debouncedHandleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedHandleResize);
    return () => {
      window.removeEventListener('resize', debouncedHandleResize);
      clearTimeout(resizeTimeout);
    };
  }, [positionManager]);

  // Report current position to parent when it changes
  useEffect(() => {
    const pos = customPosition || position;
    if (onPositionChange && pos) onPositionChange(pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customPosition, position?.x, position?.y]);

  // Cleanup effect for position manager
  useEffect(() => {
    return () => {
      // Clean up any pending debounced saves
      if (debouncedSavePosition.current) {
        clearTimeout(debouncedSavePosition.current);
        debouncedSavePosition.current = null;
      }
    };
  }, []);



  const handleValidate = () => {
    onValidateCode(studentExplanation);
  };


  // Enhanced positioning logic using OverlayPositionManager
  const getSmartPosition = () => {
    if (customPosition) return customPosition;

    // If user selected a preset, compute it immediately for deterministic behavior
    if (positionPreset !== 'auto' && positionPreset !== 'custom') {
      const p = getPresetPosition(positionPreset);
      logDebug('getSmartPosition -> preset immediate', positionPreset, p);
      return p;
    }
    // Custom dragged position
    if (positionPreset === 'custom' && customPosition) {
      logDebug('getSmartPosition -> custom', customPosition);
      return customPosition;
    }

    // If we have a position manager, use it for centralized positioning
    if (positionManager && problemId) {
      try {
        // Get editor bounds using the calculator
        const editorBounds = getEditorBounds();

        if (editorBounds) {

          // Use centralized positioning with fallback handling
          const overlayPosition = positionManager.getPositionWithFallback(editorBounds, highlightedLine);

          logger.debug("Using OverlayPositionManager position", { component: "SimpleOverlay", overlayPosition });
          return { x: overlayPosition.x, y: overlayPosition.y };
        } else {
          // Editor bounds not available, use viewport fallback
          const fallbackPosition = positionManager.getPositionWithFallback();
          logger.debug("Using viewport fallback position", { component: "SimpleOverlay", fallbackPosition });
          return { x: fallbackPosition.x, y: fallbackPosition.y };
        }
      } catch (error) {
        logger.warn("OverlayPositionManager failed, using fallback", { component: "SimpleOverlay", error });
        // Use position manager's viewport fallback if available
        try {
          const fallbackPosition = positionManager.getPositionWithFallback();
          return { x: fallbackPosition.x, y: fallbackPosition.y };
        } catch (fallbackError) {
          logger.warn("Fallback positioning also failed", { component: "SimpleOverlay", error: fallbackError });
          return getPresetPosition('center');
        }
      }
    }

    // Final fallback to legacy positioning logic when OverlayPositionManager is not available
    return getLegacyPosition();
  };

  // Persist the resolved position frequently for debugging/traceability
  useEffect(() => {
    if (!isVisible) return;
    const p = getSmartPosition();
    logDebug('persist resolved position', { preset: positionPreset, p });
    try {
      localStorage.setItem('coach_overlay_position_last', JSON.stringify({
        preset: positionPreset,
        position: p,
        viewport: { w: window.innerWidth, h: window.innerHeight },
        at: Date.now(),
      }));
    } catch {
      void 0;
    }
  }, [isVisible, positionPreset, customPosition, isMobile, highlightedLine, question, validationResult?.isCorrect]);

  // Enhanced error handling and fallback positioning
  const getErrorRecoveryPosition = useCallback(() => {
    logger.warn("Using error recovery positioning", { component: "SimpleOverlay" });

    // Try to get viewport dimensions safely
    const viewportWidth = window.innerWidth || 1024;
    const viewportHeight = window.innerHeight || 768;

    // Calculate safe fallback position
    const overlayWidth = isMobile ? Math.min(viewportWidth - 32, 400) : 420;
    const overlayHeight = 280;

    return {
      x: Math.max(16, (viewportWidth - overlayWidth) / 2),
      y: Math.max(30, (viewportHeight - overlayHeight) / 2),
    };
  }, [isMobile]);

  // Legacy positioning logic extracted for fallback
  const getLegacyPosition = () => {
    try {
      const overlayWidth = isMobile ? window.innerWidth - 32 : 420;
      const overlayHeight = 280;

      // Get Monaco editor's position in viewport using bounds calculator
      const editorBounds = getEditorBounds();

      if (!editorBounds) {
        // Fallback if editor bounds not available
        logger.warn("Editor bounds not available, using error recovery positioning", { component: "SimpleOverlay" });
        return getErrorRecoveryPosition();
      }

      logger.debug("Editor bounds and Monaco position", { component: "SimpleOverlay", editorBounds, position });

      // Validate editor bounds dimensions
      if (editorBounds.width <= 0 || editorBounds.height <= 0) {
        logger.warn("Invalid editor dimensions, using error recovery positioning", { component: "SimpleOverlay" });
        return getErrorRecoveryPosition();
      }

      // Transform Monaco editor-relative coordinates to viewport coordinates
      const viewportX = editorBounds.left + position.x;
      const viewportY = editorBounds.top + position.y;

      logger.debug("Transformed to viewport", { component: "SimpleOverlay", x: viewportX, y: viewportY });

      if (isMobile) {
        // On mobile, dock at bottom but within editor bounds
        return {
          x: Math.max(editorBounds.left + 16, 16),
          y: Math.min(editorBounds.bottom - 300, window.innerHeight - 300),
        };
      }

      // Smart offset to avoid covering the highlighted line
      const verticalOffset = 80;
      const horizontalPadding = 20;

      // Calculate ideal position with offset
      let idealX = viewportX;
      let idealY = viewportY + verticalOffset;

      // Constrain within editor bounds horizontally
      const editorMinX = editorBounds.left + horizontalPadding;
      const editorMaxX = editorBounds.right - overlayWidth - horizontalPadding;

      if (idealX < editorMinX) {
        idealX = editorMinX;
      } else if (idealX > editorMaxX) {
        idealX = editorMaxX;
      }

      // Constrain within editor bounds vertically
      const editorMinY = editorBounds.top + 20;
      const editorMaxY = editorBounds.bottom - overlayHeight - 20;

      if (idealY > editorMaxY) {
        // Try placing above the highlighted line
        const aboveY = viewportY - overlayHeight - 20;
        idealY = aboveY >= editorMinY ? aboveY : editorMaxY;
      }

      if (idealY < editorMinY) {
        idealY = editorMinY;
      }

      const finalPosition = { x: idealX, y: idealY };
      logger.debug("Final legacy position", { component: "SimpleOverlay", finalPosition });

      return finalPosition;
    } catch (error) {
      logger.error("Legacy positioning failed", error, { component: "SimpleOverlay" });
      return getErrorRecoveryPosition();
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('drag-handle')) {
      // Switch to custom preset when user starts dragging
      try { localStorage.setItem('coach_overlay_position_preset', 'custom'); } catch { void 0; }
      setPositionPreset('custom');
      setIsDragging(true);
      const rect = overlayRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  };

  // Debounced position saving during drag operations
  const debouncedSavePosition = useRef<NodeJS.Timeout | null>(null);

  const savePositionDebounced = useCallback((pos: { x: number; y: number }) => {
    if (!positionManager || !problemId) return;

    // Clear existing timeout
    if (debouncedSavePosition.current) {
      clearTimeout(debouncedSavePosition.current);
    }

    // Set new timeout for debounced save
    debouncedSavePosition.current = setTimeout(() => {
      try {
        // Get editor bounds for validation using calculator
        const editorBounds = getEditorBounds();

        if (editorBounds) {

          // Validate and constrain the position before saving
          const overlayPosition: OverlayPosition = {
            x: pos.x,
            y: pos.y,
            timestamp: Date.now(),
            screenSize: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
          };

          const validatedPosition = positionManager.validatePosition(overlayPosition, editorBounds);
          positionManager.savePosition(validatedPosition);

          // Update custom position with validated coordinates if needed
          if (validatedPosition.x !== pos.x || validatedPosition.y !== pos.y) {
            setCustomPosition({ x: validatedPosition.x, y: validatedPosition.y });
          }

          logger.debug("Position saved via OverlayPositionManager (debounced)", { component: "SimpleOverlay", validatedPosition });
        } else {
          // Save without validation if editor bounds unavailable
          const overlayPosition: OverlayPosition = {
            x: pos.x,
            y: pos.y,
            timestamp: Date.now(),
            screenSize: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
          };
          positionManager.savePosition(overlayPosition);
          logger.debug("Position saved without validation (debounced)", { component: "SimpleOverlay", overlayPosition });
        }
      } catch (error) {
        logger.warn("Failed to save position via OverlayPositionManager (debounced)", { component: "SimpleOverlay", error });
      }
    }, 300); // 300ms debounce delay
  }, [positionManager, problemId, getEditorBounds]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newPosition = {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        };
        setCustomPosition(newPosition);

        // Don't save during drag - only save on mouse up for better performance
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        const pos = customPosition || position;

        // Clear any pending debounced save
        if (debouncedSavePosition.current) {
          clearTimeout(debouncedSavePosition.current);
          debouncedSavePosition.current = null;
        }

        // Save position immediately on mouse up using OverlayPositionManager
        if (pos && positionManager && problemId) {
          try {
            // Get editor bounds for validation using calculator
            const editorBounds = getEditorBounds();

            const overlayPosition: OverlayPosition = {
              x: pos.x,
              y: pos.y,
              timestamp: Date.now(),
              screenSize: {
                width: window.innerWidth,
                height: window.innerHeight,
              },
            };

            if (editorBounds) {
              // Validate position but don't force it back into bounds
              // Allow user to place overlay wherever they want
              const isValid = positionManager.isPositionValid(overlayPosition, editorBounds);

              if (!isValid) {
                logger.debug("User placed overlay outside editor bounds - allowing it", { component: "SimpleOverlay" });
              }
            }

            // Save the exact position the user chose
            positionManager.savePosition(overlayPosition);
            logger.debug("User drag position saved", { component: "SimpleOverlay", overlayPosition });
          } catch (error) {
            logger.warn("Failed to save position", { component: "SimpleOverlay", error });
          }
        }

        // Also call the legacy callback for backward compatibility
        if (pos && onPositionChange) {
          onPositionChange(pos);
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Clean up debounced save timeout
      if (debouncedSavePosition.current) {
        clearTimeout(debouncedSavePosition.current);
        debouncedSavePosition.current = null;
      }
    };
  }, [isDragging, dragOffset, customPosition, position, onPositionChange, positionManager, problemId, getEditorBounds]);

  const resolvedPosition = useMemo(() => {
    // Explicit presets take precedence and bypass manager
    if (positionPreset !== 'auto' && positionPreset !== 'custom') {
      const p = getPresetPosition(positionPreset);
      logDebug('resolve -> preset', positionPreset, p);
      return p;
    }
    if (positionPreset === 'custom' && customPosition) {
      logDebug('resolve -> custom', customPosition);
      return customPosition;
    }
    const p = getSmartPosition();
    logDebug('resolve -> auto(manager/legacy)', p);
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionPreset, customPosition, isMobile, highlightedLine, question, validationResult?.isCorrect]);

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      role="dialog"
      tabIndex={0}
      aria-modal="true"
      aria-label="AI Coach Overlay"
      data-coach-overlay-version="2025-11-01-continue-cta"
      data-coach-overlay-preset={positionPreset}
      data-coach-overlay-left={resolvedPosition.x}
      data-coach-overlay-top={resolvedPosition.y}
      style={{
        position: "fixed",
        left: resolvedPosition.x,
        top: resolvedPosition.y,
        zIndex: 1000,
        borderRadius: "12px",
        minWidth: isMobile ? "calc(100vw - 32px)" : "420px",
        maxWidth: isMobile ? "calc(100vw - 32px)" : "500px",
        maxHeight: isMobile ? "70vh" : "60vh",
        cursor: isDragging ? "grabbing" : "default",
        transform: `scale(${isMinimized ? "0.95" : "1"})`,
        opacity: isMinimized ? 0.9 : 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      className="transition-all duration-300 ease-in-out bg-card text-card-foreground border border-border shadow-lg rounded-xl"
    >
      {/* Header with compact design */}
      <div
        className="drag-handle p-3 border-b border-border bg-muted/50 rounded-t-xl flex justify-between items-center"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <ChevronDown className="w-3 h-3 text-primary" />
            <div className="text-xs font-medium text-primary">
              AI Coach
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 hover:bg-accent hover:text-accent-foreground rounded transition-colors"
                title="Overlay position"
              >
                <MapPin className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 z-[2001]">
              <DropdownMenuLabel>Overlay Position</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={positionPreset} onValueChange={(v) => applyPreset(v as any)}>
                <DropdownMenuRadioItem value="auto">Auto (smart)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="center">Center</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="center-bottom">Center bottom</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="left-top">Top left</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="right-top">Top right</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="right-bottom">Bottom right</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="left-bottom">Bottom left</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { applyPreset('custom'); }}>Use dragged position</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-accent hover:text-accent-foreground rounded transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            <Minimize2 className="w-3 h-3 text-muted-foreground hover:text-foreground" />
          </button>
          <div
            title="Drag to move"
            className="p-1 hover:bg-accent hover:text-accent-foreground rounded cursor-move drag-handle"
          >
            <Move className="w-3 h-3 text-muted-foreground hover:text-foreground" />
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      {!isMinimized && (
        <div
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
        >
          {/* Question section - using centralized state management */}
          {shouldShowQuestion && (
            <div className="p-4">
              <div className="text-sm font-medium mb-2 text-foreground leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    em({ children, ...props }: React.HTMLAttributes<HTMLElement>) {
                      // Convert italics to bold for better emphasis
                      return <strong {...props}>{children}</strong>;
                    },
                    strong({ children, ...props }: React.HTMLAttributes<HTMLElement>) {
                      return <strong {...props}>{children}</strong>;
                    },
                  }}
                >
                  {question}
                </ReactMarkdown>
              </div>
              {hint && !validationResult && (
                <BlurredSection content={hint} />
              )}
            </div>
          )}

          {/* Session completed notification - using centralized state management */}
          {overlayState === 'completed' && (
            <div className="p-4">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400 mb-1 text-center">
                Session Complete!
              </div>
              {isOptimizable && (
                <div className="text-sm text-muted-foreground mb-3 text-center">
                  Your solution passes all tests. There’s room to optimize time/space — click Optimize to learn and improve.
                </div>
              )}
              {question && (
                <div className="text-sm text-foreground mb-3 leading-relaxed whitespace-pre-line">
                  {question}
                </div>
              )}
              {hint && (
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border-l-4 border-blue-200 dark:border-blue-600">
                  {hint}
                </div>
              )}
            </div>
          )}

          {/* Validation Result Section - don't show if session is completed */}
          {validationResult && !isSessionCompleted && (
            <div className={`px-4 py-3 border-t border-gray-200/50 dark:border-gray-600/30 ${validationResult.isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
              }`}>
              <div className="flex items-center gap-3">
                {validationResult.isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className={`text-sm font-medium mb-1 ${validationResult.isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                    }`}>
                    {validationResult.isCorrect ? 'Great work! ✨' : 'Not quite right'}
                  </div>
                  <div className={`text-sm ${validationResult.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                    }`}>
                    {validationResult.feedback}
                  </div>
                  {(() => {
                    const qRaw = (validationResult.nextStep?.question || "").trim();
                    const h = (validationResult.nextStep?.hint || "").trim();
                    // Only show next step if answer was CORRECT and not session completed
                    return Boolean(qRaw || h) && validationResult.isCorrect && !isSessionCompleted;
                  })() && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                          Next Step:
                        </div>
                        {(() => {
                           const qRaw = (validationResult.nextStep?.question || "").trim();
                           // Split question if it contains explicit solution/answer marker
                           const match = qRaw.match(/(?:Solution|Answer):\s*([\s\S]*)/i);
                           const q = match && match.index !== undefined ? qRaw.substring(0, match.index).trim() : qRaw;
                           const sol = match ? match[1].trim() : null;
                           
                           return (
                             <>
                               {q && (
                                 <div className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap mb-2">
                                   {q}
                                 </div>
                               )}
                               
                               {sol && (
                                 <div className="mt-2">
                                   <BlurredSection 
                                     content={sol} 
                                     label="Solution" 
                                     icon="✅" 
                                     className="bg-white/50 dark:bg-black/20 border-blue-300 dark:border-blue-500"
                                   />
                                 </div>
                               )}
                             </>
                           );
                        })()}
                        
                        {validationResult.nextStep?.hint?.trim() && (
                          <div className="mt-2">
                            <BlurredSection 
                              content={validationResult.nextStep.hint} 
                              className="bg-white/50 dark:bg-black/20 border-blue-300 dark:border-blue-500"
                            />
                          </div>
                        )}
                        {/* Optimization button intentionally hidden inside Next Step.
                            It should only appear after full solution completion
                            via the actions bar below. */}
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Instructions section - using centralized state management */}
          {overlayState === 'initial' && (
            <div className="px-4 py-3 border-t border-border">
              <div className="text-sm text-muted-foreground mb-3">
                Write your code in the highlighted area above, then click <strong>Check Code</strong> to validate.
              </div>

              {/* Optional explanation input */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowTextInput(!showTextInput)}
                  className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showTextInput ? 'rotate-180' : ''}`} />
                  {showTextInput ? 'Hide explanation' : 'Add explanation (optional)'}
                </button>

                {showTextInput && (
                  <div className="space-y-2">
                    <textarea
                      value={studentExplanation}
                      onChange={(e) => setStudentExplanation(e.target.value)}
                      placeholder="Explain what you're trying to do or what you're stuck on... (e.g., 'I can't figure out how to loop through this' or 'Not sure about the algorithm approach')"
                      className="w-full px-3 py-2 text-sm border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground placeholder:text-muted-foreground"
                      rows={3}
                    />
                    <div className="text-xs text-muted-foreground">
                      💡 This helps the AI coach provide more targeted feedback
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading state during validation - using centralized state management */}
          {overlayState === 'validating' && (
            <div className="px-4 py-3 border-t border-border bg-blue-50 dark:bg-blue-950/30">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Analyzing your code...
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    AI coach is reviewing your implementation and preparing feedback.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error state - AI service unavailable - don't show if session is completed */}
          {hasError && !isSessionCompleted && (
            <div className="px-4 py-3 border-t border-border bg-red-50 dark:bg-red-950/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    AI Coach Unavailable
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 mb-3">
                    The AI coaching service is temporarily down. You can continue coding on your own or exit coach mode.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fixed Actions bar - using centralized state management */}
      {!isMinimized && !hasError && (
        <div className="flex justify-center items-center p-3 border-t border-border bg-muted/20">
          {overlayState === 'completed' && (
            <div className="flex items-center gap-2">
              {/* Only show optimization button if explicitly marked as optimizable and no next step */}
              {isOptimizable && onStartOptimization && !validationResult?.nextStep?.question && (
                <Button
                  onClick={() => onStartOptimization('optimization')}
                  size="sm"
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Optimize
                </Button>
              )}
              <Button
                onClick={() => {
                  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                  if (onFinishCoaching) {
                    setTimeout(() => { onFinishCoaching(); }, 1000);
                  } else {
                    setTimeout(() => { onCancel(); }, 1000);
                  }
                }}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-green-50 px-6"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Finish
              </Button>
            </div>
          )}

          {overlayState === 'correct' && (
            <Button
              onClick={handleValidate}
              disabled={isValidating}
              size='sm'
              className='bg-green-600 hover:bg-green-700 text-green-50 px-6'
            >
              <Sparkles className='w-4 h-4 mr-2' />
              Continue
            </Button>
          )}

          {overlayState === 'incorrect' && (
            <div className="flex gap-2">
              <Button
                onClick={handleValidate}
                disabled={isValidating || isInserting}
                size="sm"
                variant="outline"
                className="border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900/20"
              >
                {isValidating ? (
                  <>
                    <div className="w-4 h-4 mr-2 border border-orange-600/30 border-t-orange-600 rounded-full animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
              {validationResult?.codeToAdd && onInsertCorrectCode && (
                <Button
                  onClick={async () => {
                    try {
                      setIsInserting(true);
                      await onInsertCorrectCode();
                    } finally {
                      setIsInserting(false);
                    }
                  }}
                  disabled={isInserting}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  {isInserting ? (
                    <>
                      <div className="w-4 h-4 mr-2 border border-white/30 border-t-white rounded-full animate-spin" />
                      Applying fix...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Use Correct Code
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {(overlayState === 'initial' || overlayState === 'validating') && (
            <Button
              onClick={handleValidate}
              disabled={isValidating || isInserting}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
            >
              {isValidating ? (
                <>
                  <div className="w-4 h-4 mr-2 border border-white/30 border-t-white rounded-full animate-spin" />
                  Checking Code...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Check Code
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Error state actions */}
      {!isMinimized && hasError && (
        <div className="flex justify-center items-center p-3 border-t border-border bg-muted/20">
          <div className="flex gap-2">
            <Button
              onClick={onCancel}
              size="sm"
              variant="outline"
              className="text-red-700 border-red-200 hover:bg-red-50 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900/20"
            >
              Continue Coding
            </Button>
            {onExitCoach && (
              <Button
                onClick={onExitCoach}
                size="sm"
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Exit Coach Mode
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Minimized state - compact */}
      {isMinimized && (
        <div className="px-4 py-3 text-center">
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            Awaiting response...
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleOverlay;
