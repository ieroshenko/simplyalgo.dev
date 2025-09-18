export interface SurveyData {
  [step: number]: string;
}

export interface SurveyStepProps {
  onAnswer: (answer: string) => void;
  currentAnswer: string;
  onNext: () => void;
  onBack: () => void;
  isCompleted: boolean;
}

export interface SurveyHeaderProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  canGoBack: boolean;
}

export interface SurveyFooterProps {
  onContinue: () => void;
  canContinue: boolean;
  isLastStep: boolean;
  isSaving?: boolean;
}

export interface Review {
  photo: string;
  name: string;
  stars: number;
  text: string;
}
