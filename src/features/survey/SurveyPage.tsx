import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SurveyHeader } from '@/features/survey/components/SurveyHeader';
import { SurveyFooter } from '@/features/survey/components/SurveyFooter';
import { CurrentRoleStep } from '@/features/survey/components/steps/CurrentRoleStep';
import { InterviewFrequencyStep } from '@/features/survey/components/steps/InterviewFrequencyStep';
import { SourceStep } from '@/features/survey/components/steps/SourceStep';
import { PlatformExperienceStep } from '@/features/survey/components/steps/PlatformExperienceStep';
import { LongTermResultsStep } from '@/features/survey/components/steps/LongTermResultsStep';
import { InterviewingLocationStep } from '@/features/survey/components/steps/InterviewingLocationStep';
import { InterviewAssessmentFrequencyStep } from '@/features/survey/components/steps/InterviewAssessmentFrequencyStep';
import { FrustrationsStep } from '@/features/survey/components/steps/FrustrationsStep';
import { GoalsStep } from '@/features/survey/components/steps/GoalsStep';
import { BottlenecksStep } from '@/features/survey/components/steps/BottlenecksStep';
import { SocialProofStep } from '@/features/survey/components/steps/SocialProofStep';
import { CustomizationIntroStep } from '@/features/survey/components/steps/CustomizationIntroStep';
import { CompanyTypeStep } from '@/features/survey/components/steps/CompanyTypeStep';
import { FocusAreasStep } from '@/features/survey/components/steps/FocusAreasStep';
import { SessionsPerWeekStep } from '@/features/survey/components/steps/SessionsPerWeekStep';
import { PlanGenerationIntroStep } from '@/features/survey/components/steps/PlanGenerationIntroStep';
import { ProgressAnimationStep } from '@/features/survey/components/steps/ProgressAnimationStep';
import { CongratulationsStep } from '@/features/survey/components/steps/CongratulationsStep';
import { CustomizedResultsStep } from '@/features/survey/components/steps/CustomizedResultsStep';
import { PaywallStep } from '@/features/survey/components/steps/PaywallStep';
import { useSurveyData } from '@/features/survey/hooks/useSurveyData';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

const TOTAL_STEPS = 20;

const Survey: React.FC = () => {
  const { stepNumber } = useParams<{ stepNumber: string }>();
  const navigate = useNavigate();
  const currentStep = parseInt(stepNumber || '1', 10);

  // Get survey data, passing user as parameter
  const {
    surveyData,
    completedSteps,
    isLoading,
    isSaving,
    updateSurveyData,
    saveToLocalStorage,
    saveToDatabase
  } = useSurveyData();

  // Validate step access
  useEffect(() => {
    if (currentStep < 1 || currentStep > TOTAL_STEPS) {
      navigate('/survey/1');
      return;
    }

    // Check if user can access this step
    if (currentStep > 1) {
      const canAccess = Array.from({ length: currentStep - 1 }, (_, i) => i + 1)
        .every(step => completedSteps.has(step));

      if (!canAccess) {
        // Find the first incomplete step
        const firstIncomplete = Array.from({ length: currentStep - 1 }, (_, i) => i + 1)
          .find(step => !completedSteps.has(step));

        if (firstIncomplete) {
          navigate(`/survey/${firstIncomplete}`);
        }
      }
    }
  }, [currentStep, completedSteps, navigate]);

  const handleAnswer = async (step: number, answer: string) => {
    // Define which steps are question steps (require answer selection)
    const questionSteps = [1, 2, 3, 4, 6, 7, 8, 9, 10, 13, 14, 15];
    const isQuestionStep = questionSteps.includes(step);

    // For question steps, only mark as completed if it's a valid answer (not empty)
    // For non-question steps, always mark as completed when they call onAnswer
    const shouldMarkCompleted = !isQuestionStep || (answer && answer.trim() !== '');

    await updateSurveyData(step, answer, shouldMarkCompleted);
  };

  const handleNext = () => {
    // if not question step, mark as completed
    if (!questionSteps.includes(currentStep)) {
      handleAnswer(currentStep, "viewed");
    }
    if (currentStep < TOTAL_STEPS) {
      navigate(`/survey/${currentStep + 1}`);

      // If we're going to the analyzing step (step 17), save data asynchronously
      if (currentStep + 1 === 17) {
        // Save data in background during analyzing step
        saveAllSurveyDataAsync();
      }
    } else {
      // Survey completed, redirect to dashboard or next step
      navigate('/dashboard');
    }
  };

  const handlePaymentSuccess = () => {
    // Payment successful, redirect to dashboard
    navigate('/dashboard');
  };

  const handlePaymentError = (error: string) => {
    logger.error('[Survey] Payment error', { error });
    // You could show a toast notification here
  };

  const handleBack = () => {
    if (currentStep > 1) {
      navigate(`/survey/${currentStep - 1}`);
    }
  };

  const saveAllSurveyDataAsync = async () => {
    try {
      await saveToDatabase();
      logger.debug('[Survey] Survey data saved successfully');
    } catch (error) {
      logger.error('[Survey] Failed to save survey data', { error });
    }
  };

  const renderStep = () => {
    const stepProps = {
      onAnswer: (answer: string) => handleAnswer(currentStep, answer),
      currentAnswer: surveyData[currentStep] || '',
      onNext: handleNext,
      onBack: handleBack,
      isCompleted: completedSteps.has(currentStep)
    };

    const customizedResultsProps = {
      ...stepProps,
      surveyData: surveyData
    };

    const paywallProps = {
      ...stepProps,
      onPaymentSuccess: handlePaymentSuccess,
      onPaymentError: handlePaymentError
    };

    switch (currentStep) {
      case 1: return <CurrentRoleStep {...stepProps} />;
      case 2: return <InterviewFrequencyStep {...stepProps} />;
      case 3: return <SourceStep {...stepProps} />;
      case 4: return <PlatformExperienceStep {...stepProps} />;
      case 5: return <LongTermResultsStep {...stepProps} />;
      case 6: return <InterviewingLocationStep {...stepProps} />;
      case 7: return <InterviewAssessmentFrequencyStep {...stepProps} />;
      case 8: return <FrustrationsStep {...stepProps} />;
      case 9: return <GoalsStep {...stepProps} />;
      case 10: return <BottlenecksStep {...stepProps} />;
      case 11: return <SocialProofStep {...stepProps} />;
      case 12: return <CustomizationIntroStep {...stepProps} />;
      case 13: return <CompanyTypeStep {...stepProps} />;
      case 14: return <FocusAreasStep {...stepProps} />;
      case 15: return <SessionsPerWeekStep {...stepProps} />;
      case 16: return <PlanGenerationIntroStep {...stepProps} />;
      case 17: return <ProgressAnimationStep {...stepProps} />;
      case 18: return <CongratulationsStep {...stepProps} />;
      case 19: return <CustomizedResultsStep {...customizedResultsProps} />;
      case 20: return <PaywallStep {...paywallProps} />;
      default: return <CurrentRoleStep {...stepProps} />;
    }
  };

  // Define which steps are question steps (require answer selection)
  const questionSteps = [1, 2, 3, 4, 6, 7, 8, 9, 10, 13, 14, 15];
  const isQuestionStep = questionSteps.includes(currentStep);

  // For question steps, require an actual answer to be selected
  // For non-question steps, they're auto-completed when viewed
  const canContinue = isQuestionStep
    ? surveyData[currentStep] && surveyData[currentStep].trim() !== ''
    : true;

  const showHeader = ![17, 20].includes(currentStep);
  const showFooter = ![17, 20].includes(currentStep);

  // Show loading state while data is being loaded
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showHeader && (
        <SurveyHeader
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          onBack={handleBack}
          canGoBack={currentStep > 1}
        />
      )}

      <main className={`flex-1 flex flex-col ${showFooter ? 'pb-24' : ''}`}>
        {renderStep()}
      </main>

      {showFooter && (
        <div className="fixed bottom-0 left-0 right-0 z-10">
          <SurveyFooter
            onContinue={handleNext}
            canContinue={canContinue}
            isLastStep={currentStep === TOTAL_STEPS}
            isSaving={isSaving}
          />
        </div>
      )}
    </div>
  );
};

export default Survey;
