export const FEATURE_FLAGS = {
  SYSTEM_DESIGN_WAR_ROOM: false,
  MOCK_INTERVIEWS: false,
  DSA_ARENA: true,
  FLASHCARDS: true, // Anki-style spaced repetition flashcards for solved problems
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (feature: FeatureFlag): boolean => {
  return FEATURE_FLAGS[feature];
};

export const isFeatureEnabledBooleal = (isEnabled: boolean): boolean => {
  return isEnabled;
};