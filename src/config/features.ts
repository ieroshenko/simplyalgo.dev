export const FEATURE_FLAGS = {
  SYSTEM_DESIGN_WAR_ROOM: false,
  MOCK_INTERVIEWS: false,
  LEETCODE_ARENA: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (feature: FeatureFlag): boolean => {
  return FEATURE_FLAGS[feature];
};