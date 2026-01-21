import type { TourStep } from './demoTourSteps';

export type TourPage = 'dashboard' | 'problems' | 'behavioral' | 'profile';

export const ONBOARDING_TOURS: Record<TourPage, TourStep[]> = {
  dashboard: [
    {
      id: 'mission-strip',
      target: '[data-tour="mission-strip"]',
      title: 'Your Mission Status',
      description: 'Track your streak, focus area, and activity status here',
      position: 'bottom',
    },
    {
      id: 'core-battle-cards',
      target: '[data-tour="core-battle-cards"]',
      title: 'Training Options',
      description: 'Choose between Problem Solving practice and Behavioral Interview prep',
      position: 'right',
    },
    {
      id: 'progress-radar',
      target: '[data-tour="progress-radar"]',
      title: 'Your Progress',
      description: 'See your overall problem-solving coverage at a glance',
      position: 'left',
    },
    {
      id: 'recent-activity',
      target: '[data-tour="recent-activity"]',
      title: 'Recent Activity',
      description: 'Quickly resume where you left off',
      position: 'left',
    },
  ],
  problems: [
    {
      id: 'problem-filters',
      target: '[data-tour="problem-filters"]',
      title: 'Filter Problems',
      description: 'Filter by category, company, or difficulty to find relevant problems',
      position: 'bottom',
    },
    {
      id: 'problem-search',
      target: '[data-tour="problem-search"]',
      title: 'Search Problems',
      description: 'Search for specific problems by name or keyword',
      position: 'bottom',
    },
    {
      id: 'problem-table',
      target: '[data-tour="problem-table"]',
      title: 'Problem List',
      description: 'Click any problem to start practicing. Star your favorites!',
      position: 'top',
    },
  ],
  behavioral: [
    {
      id: 'question-bank-card',
      target: '[data-tour="question-bank-card"]',
      title: 'Question Bank',
      description: 'Browse common behavioral questions organized by category',
      position: 'bottom',
    },
    {
      id: 'experiences-card',
      target: '[data-tour="experiences-card"]',
      title: 'My Experiences',
      description: 'Build your personal library of stories using the STAR method',
      position: 'bottom',
    },
    {
      id: 'mock-interview-card',
      target: '[data-tour="mock-interview-card"]',
      title: 'Mock Interview',
      description: 'Practice with AI-generated questions based on your resume',
      position: 'bottom',
    },
  ],
  profile: [
    {
      id: 'profile-stats',
      target: '[data-tour="profile-stats"]',
      title: 'Your Stats',
      description: 'Track problems solved, streaks, and difficulty breakdown',
      position: 'bottom',
    },
    {
      id: 'flashcards-section',
      target: '[data-tour="flashcards-section"]',
      title: 'Flashcards',
      description: 'Review saved solutions with spaced repetition for better retention',
      position: 'top',
    },
  ],
};

export const getTourSteps = (page: TourPage): TourStep[] => {
  return ONBOARDING_TOURS[page] || [];
};

export const getTourStepCount = (page: TourPage): number => {
  return ONBOARDING_TOURS[page]?.length || 0;
};
