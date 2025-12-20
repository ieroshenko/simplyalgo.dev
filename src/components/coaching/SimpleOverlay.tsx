
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { type EditorBounds } from '../../services/overlayPositionManager';
import { EditorBoundsCalculator, type MonacoEditor } from '../../services/editorBoundsCalculator';
import { SimpleOverlayProps, PositionPreset } from './overlay/types';
import { OverlayHeader } from './overlay/OverlayHeader';
import { OverlayContent } from './overlay/OverlayContent';
import { OverlayActions } from './overlay/OverlayActions';
import { useOverlayPreset } from './overlay/hooks/useOverlayPreset';
import { useOverlayDrag } from './overlay/hooks/useOverlayDrag';

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
  const [isMinimized, setIsMinimized] = useState(false);
  const [customPosition, setCustomPosition] = useState<{ x: number; y: number } | null>(null);
  const [studentExplanation, setStudentExplanation] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
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

  // Preset positioning (persisted)
  const {
    positionPreset,
    setPositionPreset,
    applyPreset,
    getPresetPosition,
  } = useOverlayPreset({
    overlayRef,
    isMobile,
    logDebug,
  });

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

  // Drag handlers
  const { isDragging, handleMouseDown } = useOverlayDrag({
    overlayRef,
    customPosition,
    setCustomPosition,
    position,
    onPositionChange,
    positionManager,
    problemId,
    getEditorBounds,
    applyPreset,
  });

  const handleApplyPreset = useCallback((preset: PositionPreset) => {
    applyPreset(preset);
    if (preset !== 'custom') {
      setCustomPosition(null);
    }
  }, [applyPreset]);

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
  }, [positionPreset, getPresetPosition, logDebug]);

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
  }, [isVisible, positionPreset, positionManager, problemId, highlightedLine, getEditorBounds, customPosition]);

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

  const handleValidate = () => {
    onValidateCode(studentExplanation);
  };

  // Enhanced error handling and fallback positioning (moved before getSmartPosition)
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

  // Legacy positioning logic extracted for fallback (moved before getSmartPosition)
  const getLegacyPosition = useCallback(() => {
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
  }, [isMobile, getEditorBounds, getErrorRecoveryPosition, position]);


  // Enhanced positioning logic using OverlayPositionManager
  const getSmartPosition = useCallback(() => {
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
  }, [customPosition, positionPreset, getPresetPosition, logDebug, positionManager, problemId, getEditorBounds, highlightedLine, getLegacyPosition]);

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
  }, [isVisible, positionPreset, customPosition, isMobile, highlightedLine, question, validationResult?.isCorrect, getSmartPosition, logDebug]);

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
      <OverlayHeader
        positionPreset={positionPreset}
        onApplyPreset={handleApplyPreset as (preset: PositionPreset | 'custom') => void}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      {!isMinimized && (
        <OverlayContent
          overlayState={overlayState}
          shouldShowQuestion={shouldShowQuestion}
          question={question}
          hint={hint}
          validationResult={validationResult}
          studentExplanation={studentExplanation}
          setStudentExplanation={setStudentExplanation}
          showTextInput={showTextInput}
          setShowTextInput={setShowTextInput}
          hasError={hasError}
          isSessionCompleted={isSessionCompleted}
        />
      )}

      {/* Actions and Footer */}
      {!isMinimized && (
        <OverlayActions
          overlayState={overlayState}
          onValidate={handleValidate}
          onCancel={onCancel}
          onFinish={onFinishCoaching}
          onExitCoach={onExitCoach}
          onStartOptimization={onStartOptimization}
          isValidating={isValidating}
          isInserting={isInserting}
          setIsInserting={setIsInserting}
          isOptimizable={isOptimizable}
          validationResult={validationResult}
          onInsertCorrectCode={onInsertCorrectCode}
          hasError={hasError}
        />
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
