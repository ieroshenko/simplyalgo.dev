import type { editor } from 'monaco-editor';
import { logger } from '@/utils/logger';
import SimpleOverlay from '@/components/coaching/SimpleOverlay';
import FeedbackOverlay from '@/components/coaching/FeedbackOverlay';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { OverlayPositionManager } from '@/services/overlayPositionManager';
import type { CoachingState } from '@/hooks/useCoachingNew';
import type React from 'react';

type ProblemSolverCoachingLayerProps = {
  coachingState: CoachingState;
  codeEditorRef: React.RefObject<editor.IStandaloneCodeEditor | null>;
  submitCoachingCode: (code: string, explanation?: string) => void;
  cancelInput: () => void;
  insertCorrectCode: () => void | Promise<void>;
  continueToNextStep?: () => void;
  startOptimization: (type?: 'optimization' | 'alternative') => void | Promise<void>;
  stopCoaching: () => void;
  closeFeedback: () => void;
  onFinishCoaching: () => void | Promise<void>;

  problemId?: string;

  overlayPositionManager: OverlayPositionManager | null;
};

export const ProblemSolverCoachingLayer = ({
  coachingState,
  codeEditorRef,
  submitCoachingCode,
  cancelInput,
  insertCorrectCode,
  continueToNextStep,
  startOptimization,
  stopCoaching,
  closeFeedback,
  onFinishCoaching,
  problemId,

  overlayPositionManager,
}: ProblemSolverCoachingLayerProps) => {
  return (
    <>
      {/* Coaching Overlays */}
      {coachingState.isCoachModeActive && coachingState.session && (
        <>
          {/* Enhanced Coaching Overlay */}
          {coachingState.showInputOverlay && coachingState.inputPosition && coachingState.session && (
            <SimpleOverlay
              isVisible={true}
              position={coachingState.inputPosition}
              onValidateCode={(explanation) => {
                const editorInstance = codeEditorRef.current;
                if (!editorInstance) {
                  logger.error('[ProblemSolverNew] Editor not available for code validation');
                  return;
                }

                const currentCode = editorInstance.getValue();
                logger.debug('[ProblemSolverNew] Validating code from editor', { codeLength: currentCode.length });

                submitCoachingCode(currentCode, explanation || 'Code validation from highlighted area');
              }}
              onCancel={cancelInput}
              isValidating={coachingState.isValidating}
              question={coachingState.session?.currentQuestion || ''}
              hint={coachingState.session?.currentHint}
              isSessionCompleted={coachingState.session?.isCompleted || false}
              validationResult={
                coachingState.lastValidation
                  ? {
                      isCorrect: coachingState.lastValidation.isCorrect,
                      feedback: coachingState.lastValidation.feedback,
                      codeToAdd: coachingState.lastValidation.codeToAdd,
                      nextStep: coachingState.lastValidation.nextStep,
                      isOptimizable: coachingState.lastValidation.isOptimizable,
                      hasAlternative: coachingState.lastValidation.hasAlternative,
                    }
                  : null
              }
              onInsertCorrectCode={insertCorrectCode}
              onContinueToNextStep={continueToNextStep}
              onPositionChange={(pos) => {
                // TODO: useCoachingNew should expose a setter for inputPosition
                // (avoids direct mutation of hook state)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (coachingState as any).inputPosition = pos as { x: number; y: number } | null;
              }}
              onStartOptimization={(type) => startOptimization(type)}
              onFinishCoaching={onFinishCoaching}
              isOptimizable={coachingState.isOptimizable || coachingState.lastValidation?.isOptimizable}
              hasError={
                coachingState.feedback?.type === 'error' &&
                coachingState.feedback?.message?.includes('AI Coach is temporarily unavailable')
              }
              onExitCoach={() => {
                logger.debug('[ProblemSolverNew] Exiting coach mode due to AI service error');
                stopCoaching();
              }}
              highlightedLine={coachingState.session.highlightArea?.startLine}
              editorHeight={600}
              editorRef={codeEditorRef}
              positionManager={overlayPositionManager}
              problemId={problemId}
            />
          )}
        </>
      )}

      {/* Loading Spinner for AI Coaching */}
      {coachingState.isWaitingForResponse && (
        <LoadingSpinner
          message={coachingState.isValidating ? 'Validating your code...' : 'AI Coach is thinking...'}
        />
      )}

      {/* Feedback Overlay for coaching errors/success */}
      {coachingState.feedback.show && (
        <FeedbackOverlay
          isVisible={coachingState.feedback.show}
          type={coachingState.feedback.type || 'hint'}
          message={coachingState.feedback.message}
          onClose={closeFeedback}
          showConfetti={coachingState.feedback.showConfetti}
        />
      )}
    </>
  );
};
