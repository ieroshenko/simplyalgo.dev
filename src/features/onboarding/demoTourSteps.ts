export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export const DEMO_TOUR_STEPS: TourStep[] = [
  {
    id: 'coach-mode',
    target: '[data-tour="coach-mode-button"]',
    title: 'AI Coach Mode',
    description: 'Get step-by-step guidance to solve problems. The AI coach breaks down the solution into manageable steps and provides personalized feedback as you code.',
    position: 'bottom',
  },
  {
    id: 'ai-chat',
    target: '[data-tour="ai-chat-panel"]',
    title: 'AI Chat Assistant',
    description: 'Ask questions, get hints, and discuss your approach. The AI assistant helps you understand concepts and provides explanations tailored to your level.',
    position: 'left',
  },
  {
    id: 'flashcard',
    target: '[data-tour="flashcard-button"]',
    title: 'Add to Flashcards',
    description: 'Save solutions to your personal flashcard deck for spaced repetition review. This helps you retain patterns and improve long-term recall.',
    position: 'bottom',
  },
];

export const DEMO_PROBLEM_ID = 'climbing-stairs';
