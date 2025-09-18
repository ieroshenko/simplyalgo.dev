import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { X, Check, AlertTriangle, CheckCircle, RotateCcw, Sparkles, Eye, EyeOff, ChevronDown, Minimize2, Move, XCircle, Zap, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';

// Blurred hint component with click-to-reveal
const BlurredHintComponent: React.FC<{ hint: string }> = ({ hint }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div 
      className="relative cursor-pointer text-xs text-muted-foreground p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border-l-4 border-blue-200 dark:border-blue-600"
      onClick={() => setIsRevealed(!isRevealed)}
    >
      <div className="flex items-center gap-2">
        {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        <span className="text-xs font-medium">
          {isRevealed ? 'Hide Hint' : 'Click to reveal hint'}
        </span>
      </div>
      {isRevealed && (
        <div className="mt-2 text-foreground">
          💡 {hint}
        </div>
      )}
      {!isRevealed && (
        <div className="mt-2 select-none filter blur-sm text-muted-foreground text-xs">
          This hint will help guide you to the solution...
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
  onPositionChange?: (pos: { x: number; y: number }) => void; // Persist user position
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
  // Enhanced positioning
  highlightedLine?: number;
  editorHeight?: number;
  // Monaco editor reference for coordinate transformation
  editorRef?: React.RefObject<{
    getDomNode?: () => HTMLElement | null;
    getScrollTop?: () => number;
    getPosition?: () => { lineNumber: number; column: number } | null;
  } | null>;
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
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [customPosition, setCustomPosition] = useState<{ x: number; y: number } | null>(null);
  const [studentExplanation, setStudentExplanation] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

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
    // Never show questions if validation shows problem is solved
    if (validationResult?.isCorrect && validationResult?.nextAction === 'complete_session') return false;
    // Never show questions if lastValidation indicates completion
    if (validationResult?.nextAction === 'complete_session') return false;
    // Show question only if we have one and session is active
    return Boolean(question && question.trim() !== '' && !isSessionCompleted);
  }, [isSessionCompleted, isValidating, question, validationResult]);

  // Reset state when overlay is hidden
  useEffect(() => {
    if (!isVisible) {
      setIsMinimized(false);
      setCustomPosition(null);
      setStudentExplanation("");
      setShowTextInput(false);
    }
  }, [isVisible]);

  // Report current position to parent when it changes
  useEffect(() => {
    const pos = customPosition || position;
    if (onPositionChange && pos) onPositionChange(pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customPosition, position?.x, position?.y]);



  const handleValidate = () => {
    onValidateCode(studentExplanation);
  };


  // Smart positioning logic - transforms Monaco coordinates to viewport and constrains within editor
  const getSmartPosition = () => {
    if (customPosition) return customPosition;
    
    const isMobile = window.innerWidth < 768;
    const overlayWidth = isMobile ? window.innerWidth - 32 : 420;
    const overlayHeight = 280;
    
    // Get Monaco editor's position in viewport
    const editorDom = editorRef?.current?.getDomNode?.();
    const editorRect = editorDom?.getBoundingClientRect();
    
    if (!editorRect) {
      // Fallback if editor DOM not available
      console.warn('⚠️ [SimpleOverlay] Editor DOM not available, using fallback positioning');
      return {
        x: isMobile ? 16 : 100,
        y: isMobile ? window.innerHeight - 300 : 150,
      };
    }
    
    console.log('🎯 [SimpleOverlay] Editor rect:', editorRect);
    console.log('🎯 [SimpleOverlay] Monaco position (editor-relative):', position);
    
    // Transform Monaco editor-relative coordinates to viewport coordinates
    const viewportX = editorRect.left + position.x;
    const viewportY = editorRect.top + position.y;
    
    console.log('🎯 [SimpleOverlay] Transformed to viewport:', { x: viewportX, y: viewportY });
    
    if (isMobile) {
      // On mobile, dock at bottom but within editor bounds
      return {
        x: Math.max(editorRect.left + 16, 16),
        y: Math.min(editorRect.bottom - 300, window.innerHeight - 300),
      };
    }
    
    // Smart offset to avoid covering the highlighted line
    const verticalOffset = 80;
    const horizontalPadding = 20;
    
    // Calculate ideal position with offset
    let idealX = viewportX;
    let idealY = viewportY + verticalOffset;
    
    // Constrain within editor bounds horizontally
    const editorMinX = editorRect.left + horizontalPadding;
    const editorMaxX = editorRect.right - overlayWidth - horizontalPadding;
    
    if (idealX < editorMinX) {
      idealX = editorMinX;
    } else if (idealX > editorMaxX) {
      idealX = editorMaxX;
    }
    
    // Constrain within editor bounds vertically
    const editorMinY = editorRect.top + 20;
    const editorMaxY = editorRect.bottom - overlayHeight - 20;
    
    if (idealY > editorMaxY) {
      // Try placing above the highlighted line
      const aboveY = viewportY - overlayHeight - 20;
      idealY = aboveY >= editorMinY ? aboveY : editorMaxY;
    }
    
    if (idealY < editorMinY) {
      idealY = editorMinY;
    }
    
    const finalPosition = { x: idealX, y: idealY };
    console.log('🎯 [SimpleOverlay] Final position:', finalPosition);
    
    return finalPosition;
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('drag-handle')) {
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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setCustomPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        const pos = customPosition || position;
        if (pos && onPositionChange) onPositionChange(pos);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, customPosition, position, onPositionChange]);

  if (!isVisible) return null;

  const smartPosition = getSmartPosition();
  const isMobile = window.innerWidth < 768;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      role="dialog"
      tabIndex={0}
      aria-modal="true"
      aria-label="AI Coach Overlay"
      style={{
        position: "fixed",
        left: smartPosition.x,
        top: smartPosition.y,
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
                {question}
              </div>
              {hint && !validationResult && (
                <BlurredHintComponent hint={hint} />
              )}
            </div>
          )}

          {/* Session completed notification - using centralized state management */}
          {overlayState === 'completed' && (
            <div className="p-4 text-center">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                 Session Complete!
              </div>
              <div className="text-sm text-muted-foreground">
                You've successfully completed this coaching session.
              </div>
            </div>
          )}

          {/* Validation Result Section - don't show if session is completed */}
          {validationResult && !isSessionCompleted && (
            <div className={`px-4 py-3 border-t border-gray-200/50 dark:border-gray-600/30 ${
              validationResult.isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex items-start gap-3">
                {validationResult.isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className={`text-sm font-medium mb-1 ${
                    validationResult.isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                  }`}>
                    {validationResult.isCorrect ? 'Great work! ✨' : 'Not quite right'}
                  </div>
                  <div className={`text-sm ${
                    validationResult.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                  }`}>
                    {validationResult.feedback}
                  </div>
                  {(() => {
                    const q = (validationResult.nextStep?.question || "").trim();
                    const h = (validationResult.nextStep?.hint || "").trim();
                    return Boolean(q || h) && !isSessionCompleted;
                  })() && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                        Next Step:
                      </div>
                      {validationResult.nextStep?.question?.trim() && (
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          {validationResult.nextStep?.question}
                        </div>
                      )}
                      {validationResult.nextStep?.hint?.trim() && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                          💡 {validationResult.nextStep.hint}
                        </div>
                      )}
                      {(() => {
                        const q = validationResult.nextStep?.question || "";
                        const h = validationResult.nextStep?.hint || "";
                        const f = validationResult.feedback || "";
                        const text = `${q} ${h} ${f}`;
                        // Remove "alternative\s+approach" from regex - only look for true optimizations
                        const mentionsOptimize = /(optimi[sz]|xor|reduce\s+space|o\(1\)\s*space|better\s+complexity|more\s+efficient)/i.test(text);
                        const hasNext = Boolean(q || h);
                        const shouldShow = validationResult.isCorrect && hasNext && (validationResult.isOptimizable || mentionsOptimize);
                        return shouldShow;
                      })() ? (
                        <Button
                          onClick={() => {
                            if (onStartOptimization) onStartOptimization();
                          }}
                          size="sm"
                          variant="outline"
                          className="mt-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/30"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Learn Optimization
                        </Button>
                      ) : null}
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
              onClick={() => {
                confetti({
                  particleCount: 100,
                  spread: 70,
                  origin: { y: 0.6 }
                });
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isInserting ? (
                    <>
                      <div className="w-4 h-4 mr-2 border border-white/30 border-t-white rounded-full animate-spin" />
                      Applying fix...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
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
