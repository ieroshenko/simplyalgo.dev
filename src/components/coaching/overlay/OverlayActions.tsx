import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Check, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import { OverlayState, OverlayValidationResult } from './types';
import { CorrectCodeDialog } from './CorrectCodeDialog';

interface OverlayActionsProps {
    overlayState: OverlayState;
    onValidate: () => void;
    onCancel: () => void;
    onFinish?: () => void;
    onExitCoach?: () => void;
    onContinueToNextStep?: () => void; // Continue to next step without validating
    onStartOptimization?: (type: 'optimization' | 'alternative') => void;
    isValidating: boolean;
    isInserting: boolean;
    isOptimizable?: boolean;
    validationResult?: OverlayValidationResult | null;
    onInsertCorrectCode?: () => Promise<void> | void;
    setIsInserting: (val: boolean) => void;
    hasError: boolean;
}

export const OverlayActions: React.FC<OverlayActionsProps> = ({
    overlayState,
    onValidate,
    onCancel,
    onFinish,
    onExitCoach,
    onContinueToNextStep,
    onStartOptimization,
    isValidating,
    isInserting,
    isOptimizable,
    validationResult,
    onInsertCorrectCode,
    setIsInserting,
    hasError
}) => {
    const handleFinish = () => {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        if (onFinish) {
            setTimeout(() => { onFinish(); }, 1000);
        } else {
            setTimeout(() => { onCancel(); }, 1000);
        }
    };

    const handleOpenDialog = () => {
        const dialog = document.getElementById('correct-code-dialog') as HTMLDialogElement;
        if (dialog) {
            dialog.showModal();
        }
    };

    const handleCloseDialog = () => {
        const dialog = document.getElementById('correct-code-dialog') as HTMLDialogElement;
        if (dialog) {
            dialog.close();
        }
    };

    const handleInsertWrapper = async () => {
        if (!onInsertCorrectCode) return;
        try {
            setIsInserting(true);
            await onInsertCorrectCode();
        } finally {
            setIsInserting(false);
        }
    };

    return (
        <div className="flex justify-center items-center p-3 border-t border-border bg-muted/20 flex-col gap-2">
            <div className="flex items-center gap-2">
                {hasError && (
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
                )}

                {!hasError && overlayState === 'completed' && (
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
                            onClick={handleFinish}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-green-50 px-6"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Finish
                        </Button>
                    </div>
                )}

                {!hasError && overlayState === 'correct' && (
                    <Button
                        onClick={() => {
                            // If we have a next step ready, continue without validating
                            // Otherwise, validate (for edge cases)
                            if (onContinueToNextStep && validationResult?.nextStep?.question) {
                                onContinueToNextStep();
                            } else {
                                onValidate();
                            }
                        }}
                        disabled={isValidating}
                        size='sm'
                        className='bg-green-600 hover:bg-green-700 text-green-50 px-6'
                    >
                        <Sparkles className='w-4 h-4 mr-2' />
                        Continue
                    </Button>
                )}

                {!hasError && overlayState === 'incorrect' && (
                    <div className="flex gap-2">
                        <Button
                            onClick={onValidate}
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
                        {validationResult?.codeToAdd && (
                            <Button
                                onClick={handleOpenDialog}
                                size="sm"
                                variant="outline"
                                className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20"
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                View Code
                            </Button>
                        )}
                    </div>
                )}

                {!hasError && (overlayState === 'initial' || overlayState === 'validating') && (
                    <Button
                        onClick={onValidate}
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

            <CorrectCodeDialog
                code={validationResult?.codeToAdd}
                onInsertCode={onInsertCorrectCode ? handleInsertWrapper : undefined}
                isInserting={isInserting}
                onClose={handleCloseDialog}
            />
        </div>
    );
};
