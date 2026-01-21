import React, { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { DEMO_PROBLEM_ID } from '@/features/onboarding/demoTourSteps';
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
// import { SocialProofStep } from '@/features/survey/components/steps/SocialProofStep'; // Hidden temporarily
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
import { logger } from '@/utils/logger';
// Import images for eager loading
import longTermResultsImage from '@/assets/survey/simply-algo-creates-long-term-results.png';
import letsMakeSimplyalgoFitImage from '@/assets/survey/lets-make-simplyalgo-fit.png';
import timeToGeneratePlanImage from '@/assets/survey/time-to-generate-custom-plan.png';
import jakePhoto from '@/assets/survey/user_reviews/jake.png';
import priyaPhoto from '@/assets/survey/user_reviews/priya.png';
import ashwinPhoto from '@/assets/survey/user_reviews/ashwin.png';

const TOTAL_STEPS = 20;

const Survey: React.FC = () => {
  const { stepNumber } = useParams<{ stepNumber: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentStep = parseInt(stepNumber || '1', 10);

  // Admin mode detection
  const isAdminMode = searchParams.get('admin') === 'true';

  // Navigate to demo for admin testing
  const handleGoToDemo = () => {
    // Clear demo state so tour starts fresh
    localStorage.removeItem('simplyalgo_demo_state');
    navigate(`/problems/${DEMO_PROBLEM_ID}?demo=true`);
  };

  // Get survey data, passing user as parameter
  const {
    surveyData,
    completedSteps,
    isLoading,
    updateSurveyData,
    saveToDatabase
  } = useSurveyData();

  // Eager load all survey images
  useEffect(() => {
    const images = [
      longTermResultsImage,
      letsMakeSimplyalgoFitImage,
      timeToGeneratePlanImage,
      jakePhoto,
      priyaPhoto,
      ashwinPhoto
    ];

    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Validate step access
  useEffect(() => {
    if (currentStep < 1 || currentStep > TOTAL_STEPS) {
      navigate(`/survey/1${isAdminMode ? '?admin=true' : ''}`);
      return;
    }

    // Skip step 11 (SocialProofStep) - redirect to step 12
    if (currentStep === 11) {
      navigate(`/survey/12${isAdminMode ? '?admin=true' : ''}`);
      return;
    }

    // Admin mode bypasses step validation
    if (isAdminMode) {
      return;
    }

    // Check if user can access this step
    if (currentStep > 1) {
      const canAccess = Array.from({ length: currentStep - 1 }, (_, i) => i + 1)
        .filter(step => step !== 11) // Exclude step 11 from validation
        .every(step => completedSteps.has(step));

      if (!canAccess) {
        // Find the first incomplete step (excluding step 11)
        const firstIncomplete = Array.from({ length: currentStep - 1 }, (_, i) => i + 1)
          .filter(step => step !== 11)
          .find(step => !completedSteps.has(step));

        if (firstIncomplete) {
          navigate(`/survey/${firstIncomplete}`);
        }
      }
    }
  }, [currentStep, completedSteps, navigate, isAdminMode]);

  const handleAnswer = (step: number, answer: string) => {
    // Define which steps are question steps (require answer selection)
    const questionSteps = [1, 2, 3, 4, 6, 7, 8, 9, 10, 13, 14, 15];
    const isQuestionStep = questionSteps.includes(step);

    // For question steps, only mark as completed if it's a valid answer (not empty)
    // For non-question steps, always mark as completed when they call onAnswer
    const shouldMarkCompleted = !isQuestionStep || (answer && answer.trim() !== '');

    // Save asynchronously - don't await, let it happen in the background
    // The optimistic update already makes the UI responsive
    updateSurveyData(step, answer, shouldMarkCompleted);
  };

  const handleNext = () => {
    // if not question step, mark as completed
    if (!questionSteps.includes(currentStep)) {
      handleAnswer(currentStep, "viewed");
    }
    if (currentStep < TOTAL_STEPS) {
      // Skip step 11 (SocialProofStep)
      let nextStep = currentStep + 1;
      if (nextStep === 11) {
        nextStep = 12;
      }

      // After step 19 (CustomizedResultsStep), redirect to demo problem
      if (currentStep === 19) {
        // Clear demo state so tour starts fresh
        localStorage.removeItem('simplyalgo_demo_state');
        navigate(`/problems/${DEMO_PROBLEM_ID}?demo=true`);
        return;
      }

      navigate(`/survey/${nextStep}${isAdminMode ? '?admin=true' : ''}`);

      // If we're going to the analyzing step (step 17), save data asynchronously
      if (nextStep === 17) {
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
      // Skip step 11 (SocialProofStep) when going back
      let prevStep = currentStep - 1;
      if (prevStep === 11) {
        prevStep = 10;
      }
      navigate(`/survey/${prevStep}${isAdminMode ? '?admin=true' : ''}`);
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
      case 11: return null; // SocialProofStep hidden
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

      {/* Admin Mode Indicator */}
      {isAdminMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
          <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
            Admin Mode - Step validation bypassed
          </span>
        </div>
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
            isSaving={false}
          />
        </div>
      )}

      {/* Admin-only Go to Demo button */}
      {isAdminMode && (
        <Button
          onClick={handleGoToDemo}
          className="fixed top-4 right-4 z-20 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
        >
          <Play className="h-4 w-4 mr-2" />
          Go to Demo
        </Button>
      )}
    </div>
  );
};

export default Survey;
