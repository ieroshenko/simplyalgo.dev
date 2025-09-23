import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
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
  


  const handleToggle = async (checked: boolean) => {
    const newMode: CoachingMode = checked ? 'socratic' : 'comprehensive';
    const previousMode = currentMode;
    
    console.log('🔄 Toggle clicked:', { previousMode, newMode, checked });
    
    // Prevent rapid toggling
    if (isToggling) return;
    
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
      const toggleError = error instanceof Error && 'code' in error 
        ? error as CoachingModeError
        : createCoachingModeError(
            `Failed to change coaching mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'TOGGLE_FAILURE',
            previousMode,
            newMode
          );
      
      logCoachingModeError(toggleError, { 
        component: 'CoachingModeToggle',
        previousMode,
        newMode,
        checked 
      });
      
      // Get user-friendly error message
      const errorMessage = getCoachingModeErrorMessage(toggleError);
      
      // Provide user feedback for mode change failure
      toast({
        title: errorMessage.title,
        description: errorMessage.description,
        variant: "destructive",
        duration: 4000,
      });
      
      // Call error handler if provided
      if (onError) {
        onError(toggleError);
      }
      
      // Note: We don't need to revert the UI state since onModeChange should handle validation
      // and the useCoachingMode hook has its own error handling
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-3", className)}>
        {/* Mode Labels */}
        <div className="flex items-center gap-2 text-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <span 
                className={cn(
                  "font-medium transition-colors cursor-help",
                  !isSocratic ? "text-primary" : "text-muted-foreground"
                )}
              >
                Comprehensive
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Get detailed explanations, complete solutions, and comprehensive guidance</p>
            </TooltipContent>
          </Tooltip>

          {/* Toggle Switch */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Switch
                  checked={isSocratic}
                  onCheckedChange={handleToggle}
                  disabled={disabled || isToggling}
                  aria-label={`Switch to ${isSocratic ? 'comprehensive' : 'socratic'} coaching mode`}
                  aria-describedby="coaching-mode-description"
                  className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Toggle between coaching modes</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span 
                className={cn(
                  "font-medium transition-colors cursor-help",
                  isSocratic ? "text-primary" : "text-muted-foreground"
                )}
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