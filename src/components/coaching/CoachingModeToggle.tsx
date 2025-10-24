import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CoachingMode } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { 
  createCoachingModeError, 
  getCoachingModeErrorMessage, 
  logCoachingModeError,
  type CoachingModeError 
} from '@/services/coachingModeErrorRecovery';

export interface CoachingModeToggleProps {
  currentMode: CoachingMode;
  onModeChange: (mode: CoachingMode) => void;
  disabled?: boolean;
  className?: string;
  onError?: (error: Error) => void;
}

export const CoachingModeToggle: React.FC<CoachingModeToggleProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
  className,
  onError
}) => {
  const { toast } = useToast();
  const [isToggling, setIsToggling] = useState(false);
  const isSocratic = currentMode === 'socratic';
  


  const handleModeChange = async (newMode: CoachingMode) => {
    const previousMode = currentMode;
    
    console.log('🔄 Mode button clicked:', { previousMode, newMode });
    
    // Prevent rapid clicking
    if (isToggling) return;
    
    // Don't change if already in the selected mode
    if (newMode === currentMode) return;
    
    try {
      setIsToggling(true);
      
      // Validate the new mode
      if (!['socratic', 'comprehensive'].includes(newMode)) {
        const validationError = createCoachingModeError(
          `Invalid coaching mode: ${newMode}`,
          'INVALID_MODE',
          previousMode,
          newMode
        );
        throw validationError;
      }
      
      // Attempt to change mode
      console.log('🔄 Calling onModeChange with:', newMode);
      onModeChange(newMode);
      
      // Provide user feedback for successful mode change
      toast({
        title: "Coaching Mode Changed",
        description: `Switched to ${newMode === 'socratic' ? 'Socratic' : 'Comprehensive'} mode`,
        duration: 2000,
      });
      
    } catch (error) {
      const modeChangeError = error instanceof Error && 'code' in error 
        ? error as CoachingModeError
        : createCoachingModeError(
            `Failed to change coaching mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'TOGGLE_FAILURE',
            previousMode,
            newMode
          );
      
      logCoachingModeError(modeChangeError, { 
        component: 'CoachingModeToggle',
        previousMode,
        newMode
      });
      
      // Get user-friendly error message
      const errorMessage = getCoachingModeErrorMessage(modeChangeError);
      
      // Provide user feedback for mode change failure
      toast({
        title: errorMessage.title,
        description: errorMessage.description,
        variant: "destructive",
        duration: 4000,
      });
      
      // Call error handler if provided
      if (onError) {
        onError(modeChangeError);
      }
      
      // Note: We don't need to revert the UI state since onModeChange should handle validation
      // and the useCoachingMode hook has its own error handling
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Mode Text Buttons */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                onClick={() => handleModeChange('comprehensive')}
                className={cn(
                  "text-sm font-medium cursor-pointer transition-colors duration-200",
                  "hover:text-primary focus:outline-none focus:text-primary",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  !isSocratic 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
                aria-label="Switch to comprehensive coaching mode"
                aria-describedby="coaching-mode-description"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleModeChange('comprehensive');
                  }
                }}
              >
                Comprehensive
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Get detailed explanations, complete solutions, and comprehensive guidance</p>
            </TooltipContent>
          </Tooltip>

          <span className="text-gray-300">|</span>

          <Tooltip>
            <TooltipTrigger asChild>
              <span
                onClick={() => handleModeChange('socratic')}
                className={cn(
                  "text-sm font-medium cursor-pointer transition-colors duration-200",
                  "hover:text-primary focus:outline-none focus:text-primary",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isSocratic 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
                aria-label="Switch to socratic coaching mode"
                aria-describedby="coaching-mode-description"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleModeChange('socratic');
                  }
                }}
              >
                Socratic
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Learn through guided questions that help you discover solutions yourself</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Screen reader description */}
        <div id="coaching-mode-description" className="sr-only">
          Current mode: {currentMode}. 
          {isSocratic 
            ? "Socratic mode guides you with questions to help you discover solutions." 
            : "Comprehensive mode provides detailed explanations and complete solutions."
          }
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CoachingModeToggle;