export const FEATURE_FLAGS = {
  SYSTEM_DESIGN_WAR_ROOM: false,
  MOCK_INTERVIEWS: false,
  DSA_ARENA: true,
  FLASHCARDS: true, // Anki-style spaced repetition flashcards for solved problems
  BEHAVIORAL_INTERVIEW: false, // AI-powered behavioral interview practice
  TECHNICAL_INTERVIEW: false, // AI-powered technical mock interview
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (feature: FeatureFlag): boolean => {
  return FEATURE_FLAGS[feature];
};

export const isFeatureEnabledBooleal = (isEnabled: boolean): boolean => {
  return isEnabled;
};