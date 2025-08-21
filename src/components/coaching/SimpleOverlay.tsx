import React, { useState, useRef, useEffect } from "react";
import { Minimize2, Move, Check, ChevronDown, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SimpleOverlayProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onValidateCode: () => void;
  onCancel: () => void;
  onExitCoach?: () => void;
  isValidating?: boolean;
  hasError?: boolean;
  // Coaching specific props
  question?: string;
  hint?: string;
  stepInfo?: { current: number; total: number };
  // Validation feedback
  validationResult?: {
    isCorrect: boolean;
    feedback: string;
    nextStep?: {
      question: string;
      hint: string;
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
  isValidating = false,
  hasError = false,
  question,
  hint,
  stepInfo,
  validationResult,
  highlightedLine,
  editorHeight,
  editorRef,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [customPosition, setCustomPosition] = useState<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);


  // Reset state when overlay is hidden
  useEffect(() => {
    if (!isVisible) {
      setIsMinimized(false);
      setCustomPosition(null);
    }
  }, [isVisible]);



  const handleValidate = () => {
    onValidateCode();
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
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!isVisible) return null;

  const smartPosition = getSmartPosition();
  const isMobile = window.innerWidth < 768;

  return (
    <>
      {/* Arrow connector - pointing to highlighted code */}
      {!isMobile && !customPosition && highlightedLine && editorRef?.current && (
        (() => {
          const editorDom = editorRef.current?.getDomNode?.();
          const editorRect = editorDom?.getBoundingClientRect();
          
          if (!editorRect) return null;
          
          // Calculate highlighted line position in viewport
          const highlightedY = editorRect.top + position.y;
          const arrowY = smartPosition.y - 8;
          const shouldShowAbove = smartPosition.y > highlightedY;
          
          return (
            <div
              style={{
                position: "fixed",
                left: smartPosition.x + 20,
                top: arrowY,
                zIndex: 999,
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent", 
                ...(shouldShowAbove 
                  ? { borderTop: "12px solid #3b82f6" }
                  : { borderBottom: "12px solid #3b82f6" }
                ),
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
              }}
              className="transition-all duration-300 ease-in-out"
            />
          );
        })()
      )}
      
      {/* Connection line - connects arrow to highlighted code */}
      {!isMobile && !customPosition && highlightedLine && editorRef?.current && (
        (() => {
          const editorDom = editorRef.current?.getDomNode?.();
          const editorRect = editorDom?.getBoundingClientRect();
          
          if (!editorRect) return null;
          
          // Calculate line position and height
          const highlightedViewportY = editorRect.top + position.y;
          const connectionStartY = Math.min(smartPosition.y - 8, highlightedViewportY + 15);
          const connectionEndY = Math.max(smartPosition.y - 8, highlightedViewportY + 15);
          const lineHeight = Math.abs(connectionEndY - connectionStartY);
          
          return lineHeight > 20 ? (
            <div
              style={{
                position: "fixed",
                left: smartPosition.x + 27,
                top: connectionStartY,
                width: "2px",
                height: lineHeight,
                backgroundColor: "#3b82f6",
                opacity: 0.6,
                zIndex: 998,
              }}
              className="transition-all duration-300 ease-in-out"
            />
          ) : null;
        })()
      )}
      
      <div
        ref={overlayRef}
        onMouseDown={handleMouseDown}
        style={{
          position: "fixed",
          left: smartPosition.x,
          top: smartPosition.y,
          zIndex: 1000,
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(16px) saturate(1.2)",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          borderRadius: "12px",
          boxShadow: "0 16px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
          minWidth: isMobile ? "calc(100vw - 32px)" : "420px",
          maxWidth: isMobile ? "calc(100vw - 32px)" : "480px",
          maxHeight: isMobile ? "400px" : "350px",
          cursor: isDragging ? "grabbing" : "default",
          transform: `scale(${isMinimized ? "0.95" : "1"})`,
          opacity: isMinimized ? 0.7 : 1,
          overflow: "hidden",
        }}
        className="dark:bg-gray-800/80 dark:border-gray-600/40 transition-all duration-300 ease-in-out"
      >
      {/* Header with compact design */}
      <div 
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid rgba(229, 231, 235, 0.3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(249, 250, 251, 0.6)",
          borderRadius: "11px 11px 0 0",
        }}
        className="dark:bg-gray-750/60 dark:border-gray-600/30 drag-handle"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <ChevronDown className="w-3 h-3 text-blue-500" />
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
              AI Coach
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            <Minimize2 className="w-3 h-3 text-gray-400 hover:text-gray-600" />
          </button>
          <div 
            title="Drag to move"
            className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded cursor-move drag-handle"
          >
            <Move className="w-3 h-3 text-gray-400 hover:text-gray-600" />
          </div>
        </div>
      </div>

      {/* Question section */}
      {question && !isMinimized && (
        <div 
          style={{ 
            padding: "16px", 
            maxHeight: "120px",
            overflowY: "auto",
            scrollbarWidth: "thin"
          }}
          className="scrollbar-thin scrollbar-thumb-gray-300/50 dark:scrollbar-thumb-gray-600/50 hover:scrollbar-thumb-gray-400/70"
        >
          <div 
            style={{ 
              fontSize: "14px", 
              fontWeight: "500", 
              marginBottom: hint ? "8px" : "0",
              color: "#1f2937",
              lineHeight: "1.6"
            }}
            className="dark:text-gray-100"
          >
            {question}
          </div>
          {hint && (
            <div 
              style={{ 
                fontSize: "12px", 
                color: "#6b7280",
                padding: "6px 10px",
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                borderRadius: "6px",
                borderLeft: "3px solid rgba(59, 130, 246, 0.3)"
              }}
              className="dark:text-gray-400 dark:bg-blue-500/10"
            >
              {hint}
            </div>
          )}
        </div>
      )}

      {/* Validation Result Section */}
      {!isMinimized && validationResult && (
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
              {validationResult.nextStep && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Next Step:
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    {validationResult.nextStep.question}
                  </div>
                  {validationResult.nextStep.hint && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                      💡 {validationResult.nextStep.hint}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions section */}
      {!isMinimized && !validationResult && (
        <div className="px-4 py-3 border-t border-gray-200/50 dark:border-gray-600/30">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Write your code in the highlighted area above, then click <strong>Check Code</strong> to validate.
          </div>
        </div>
      )}

      {/* Error state - AI service unavailable */}
      {!isMinimized && hasError && (
        <div className="px-4 py-3 border-t border-red-200/50 dark:border-red-600/30 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                AI Coach Unavailable
              </div>
              <div className="text-sm text-red-700 dark:text-red-300 mb-3">
                The AI coaching service is temporarily down. You can continue coding on your own or exit coach mode.
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={onCancel}
                  size="sm"
                  variant="outline"
                  className="text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900/30"
                >
                  Continue Coding
                </Button>
                {onExitCoach && (
                  <Button
                    onClick={onExitCoach}
                    size="sm"
                    className="bg-red-600/90 hover:bg-red-700/90 text-white"
                  >
                    Exit Coach Mode
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions bar */}
      {!isMinimized && !hasError && (
        <div 
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "12px",
            borderTop: "1px solid rgba(229, 231, 235, 0.3)",
            backgroundColor: "rgba(249, 250, 251, 0.4)",
          }}
          className="dark:border-gray-600/30 dark:bg-gray-750/40"
        >
          {validationResult?.isCorrect ? (
            <Button
              onClick={onCancel}
              size="sm"
              className="bg-green-600/90 hover:bg-green-700/90 text-white backdrop-blur-sm shadow-md px-6"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Continue
            </Button>
          ) : validationResult && !validationResult.isCorrect ? (
            <Button
              onClick={handleValidate}
              disabled={isValidating}
              size="sm"
              className="bg-orange-600/90 hover:bg-orange-700/90 text-white backdrop-blur-sm shadow-md px-6"
            >
              {isValidating ? (
                <>
                  <div className="w-4 h-4 mr-2 border border-white/30 border-t-white rounded-full animate-spin" />
                  Checking Code...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleValidate}
              disabled={isValidating}
              size="sm"
              className="bg-blue-600/90 hover:bg-blue-700/90 text-white backdrop-blur-sm shadow-md px-6"
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
      
      {/* Minimized state - compact */}
      {isMinimized && (
        <div className="px-4 py-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            Awaiting response...
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse animation-delay-150" />
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default SimpleOverlay;