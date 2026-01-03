
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { logger } from '@/utils/logger';
import type { EditorBounds } from '@/services/overlayPositionManager';
import { SimpleOverlayProps, PositionPreset } from './overlay/types';
import { OverlayHeader } from './overlay/OverlayHeader';
import { OverlayContent } from './overlay/OverlayContent';
import { OverlayActions } from './overlay/OverlayActions';
import { useOverlayPreset } from './overlay/hooks/useOverlayPreset';
import { useOverlayDrag } from './overlay/hooks/useOverlayDrag';
import { useOverlayEditorBounds } from './overlay/hooks/useOverlayEditorBounds';
import { useOverlaySmartPosition } from './overlay/hooks/useOverlaySmartPosition';

const SimpleOverlay: React.FC<SimpleOverlayProps> = ({
  isVisible,
  position,
  onValidateCode,
  onCancel,
  onExitCoach,
  onFinishCoaching,
  onInsertCorrectCode,
  onContinueToNextStep,
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

  // Responsive positioning state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Preset positioning (persisted)
  const {
    positionPreset,
    applyPreset,
    getPresetPosition,
  } = useOverlayPreset({
    overlayRef,
    isMobile,
    logDebug,
  });

  const handleBoundsChange = useCallback((bounds: EditorBounds) => {
    // Only update position if we don't have a custom position set by user
    if (!customPosition && positionManager && problemId) {
      const newPosition = positionManager.getPositionWithFallback(bounds, highlightedLine);
      setCustomPosition({ x: newPosition.x, y: newPosition.y });
    }
  }, [customPosition, positionManager, problemId, highlightedLine]);

  const { getEditorBounds } = useOverlayEditorBounds({
    editorRef,
    onBoundsChange: handleBoundsChange,
  });

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
      // The overlay will naturally constrain itself if it goes out of bounds via smart positioning
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

  const { resolvedPosition } = useOverlaySmartPosition({
    isVisible,
    positionPreset,
    customPosition,
    setCustomPosition,
    isMobile,
    position,
    positionManager,
    problemId,
    highlightedLine,
    getEditorBounds,
    getPresetPosition,
    logDebug,
  });

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
          onContinueToNextStep={onContinueToNextStep}
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
