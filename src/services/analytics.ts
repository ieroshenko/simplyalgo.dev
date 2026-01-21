import posthog from 'posthog-js';
import { logger } from '@/utils/logger';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let isInitialized = false;

/**
 * Initialize PostHog analytics with FULL tracking enabled
 * - Autocapture: All clicks, inputs, form submissions
 * - Session Recording: Full session replays with heatmaps
 * - Pageview tracking: All page navigation
 * - Time on page: How long users spend on each page
 */
export const initAnalytics = () => {
    if (typeof window === 'undefined') return;
    if (isInitialized) return;

    // Check if we have a real key
    const isRealKey = POSTHOG_KEY && POSTHOG_KEY.startsWith('phc_');

    if (!isRealKey) {
        logger.debug('[Analytics] PostHog key not configured, skipping initialization');
        return;
    }

    try {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,

            // User identification
            person_profiles: 'identified_only',

            // ===== AUTOCAPTURE - Track all clicks, inputs, form submissions =====
            autocapture: true, // Capture all clicks, changes, submits automatically
            capture_pageview: true, // Auto-capture page views
            capture_pageleave: true, // Track when users leave pages (time on page)

            // ===== SESSION RECORDING - Full visual replay of user sessions =====
            enable_recording_console_log: true, // Capture console logs in recordings
            disable_session_recording: false, // Enable session recording

            // ===== HEATMAPS & SCROLL TRACKING =====
            enable_heatmaps: true, // Click heatmaps and scroll depth

            // ===== PERFORMANCE & ATTRIBUTION =====
            capture_performance: true, // Web vitals, page load times

            // ===== PRIVACY SETTINGS (capture everything for our app) =====
            mask_all_text: false, // Don't mask text - we want to see code editor content
            mask_all_element_attributes: false,

            // ===== ADVANCED OPTIONS =====
            persistence: 'localStorage+cookie', // Persist user identity across sessions

            // Debug in development
            loaded: (ph) => {
                if (import.meta.env.DEV) {
                    ph.debug();
                    logger.info('[Analytics] PostHog initialized with FULL tracking:');
                    logger.info('[Analytics] ✓ Autocapture (all clicks, inputs, forms)');
                    logger.info('[Analytics] ✓ Session Recording (visual replays)');
                    logger.info('[Analytics] ✓ Heatmaps (click & scroll tracking)');
                    logger.info('[Analytics] ✓ Performance (web vitals, load times)');
                }
                isInitialized = true;

                // Ensure session recording is running
                ph.startSessionRecording();
            }
        });

        logger.info('[Analytics] PostHog initialized successfully');
    } catch (error) {
        logger.error('[Analytics] Failed to initialize PostHog', { error });
    }
};

/**
 * Track a custom event
 */
export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    if (!isInitialized) return;

    try {
        posthog.capture(eventName, properties);
        logger.debug('[Analytics] Event tracked', { eventName, properties });
    } catch (error) {
        logger.error('[Analytics] Failed to track event', { eventName, error });
    }
};

/**
 * Track a pageview
 */
export const trackPageview = (url?: string) => {
    if (typeof window === 'undefined') return;
    if (!isInitialized) return;

    try {
        posthog.capture('$pageview', {
            '$current_url': url || window.location.href,
        });
    } catch (error) {
        logger.error('[Analytics] Failed to track pageview', { error });
    }
};

/**
 * Identify a user
 */
export const identifyUser = (userId: string, traits?: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    if (!isInitialized) return;

    try {
        posthog.identify(userId, traits);
        logger.debug('[Analytics] User identified', { userId });
    } catch (error) {
        logger.error('[Analytics] Failed to identify user', { userId, error });
    }
};

/**
 * Reset analytics (call on logout)
 */
export const resetAnalytics = () => {
    if (typeof window === 'undefined') return;
    if (!isInitialized) return;

    try {
        posthog.reset();
        logger.debug('[Analytics] Analytics reset');
    } catch (error) {
        logger.error('[Analytics] Failed to reset analytics', { error });
    }
};

// Pre-defined event names for consistency
export const AnalyticsEvents = {
    // ===== Auth events =====
    USER_SIGNED_UP: 'user_signed_up',
    USER_LOGGED_IN: 'user_logged_in',
    USER_LOGGED_OUT: 'user_logged_out',

    // ===== Problem solving events =====
    PROBLEM_VIEWED: 'problem_viewed',
    PROBLEM_STARTED: 'problem_started',
    PROBLEM_SUBMITTED: 'problem_submitted',
    PROBLEM_COMPLETED: 'problem_completed',
    PROBLEM_FAILED: 'problem_failed',
    CODE_RUN: 'code_run',
    CODE_SUBMITTED: 'code_submitted',
    TEST_PASSED: 'test_passed',
    TEST_FAILED: 'test_failed',
    HINT_REQUESTED: 'hint_requested',
    SOLUTION_VIEWED: 'solution_viewed',

    // ===== Problems List events =====
    PROBLEMS_LIST_VIEWED: 'problems_list_viewed',
    PROBLEM_FILTERED: 'problem_filtered',
    PROBLEM_SORTED: 'problem_sorted',
    PROBLEM_SEARCHED: 'problem_searched',
    PROBLEM_CLICKED: 'problem_clicked',

    // ===== AI Coach events =====
    AI_CHAT_OPENED: 'ai_chat_opened',
    AI_CHAT_STARTED: 'ai_chat_started',
    AI_CHAT_MESSAGE_SENT: 'ai_chat_message_sent',
    AI_CHAT_CODE_INSERTED: 'ai_chat_code_inserted',
    AI_VISUALIZATION_OPENED: 'ai_visualization_opened',
    AI_COACHING_SESSION_STARTED: 'ai_coaching_session_started',
    AI_COACHING_STEP_COMPLETED: 'ai_coaching_step_completed',

    // ===== Coach Mode events =====
    COACH_MODE_ENABLED: 'coach_mode_enabled',
    COACH_STEP_PROMPTED: 'coach_step_prompted',
    COACH_STEP_SUBMITTED: 'coach_step_submitted',
    COACH_STEP_CORRECT: 'coach_step_correct',
    COACH_STEP_INCORRECT: 'coach_step_incorrect',
    COACH_PROBLEM_COMPLETED: 'coach_problem_completed',
    COACH_PROBLEM_ABANDONED: 'coach_problem_abandoned',

    // ===== Behavioral events =====
    BEHAVIORAL_PRACTICE_STARTED: 'behavioral_practice_started',
    BEHAVIORAL_STORY_CREATED: 'behavioral_story_created',
    BEHAVIORAL_STORY_EDITED: 'behavioral_story_edited',
    BEHAVIORAL_STORY_DELETED: 'behavioral_story_deleted',
    BEHAVIORAL_QUESTION_ANSWERED: 'behavioral_question_answered',
    MOCK_INTERVIEW_STARTED: 'mock_interview_started',
    MOCK_INTERVIEW_COMPLETED: 'mock_interview_completed',
    STORY_CREATION_STARTED: 'story_creation_started',
    STORY_CREATION_ABANDONED: 'story_creation_abandoned',

    // ===== Technical Interview events =====
    TECHNICAL_INTERVIEW_STARTED: 'technical_interview_started',
    TECHNICAL_INTERVIEW_QUESTION_ANSWERED: 'technical_interview_question_answered',
    TECHNICAL_INTERVIEW_COMPLETED: 'technical_interview_completed',

    // ===== Dashboard events =====
    DASHBOARD_VIEWED: 'dashboard_viewed',
    STREAK_VIEWED: 'streak_viewed',
    PROGRESS_CHECKED: 'progress_checked',

    // ===== Settings events =====
    SETTINGS_VIEWED: 'settings_viewed',
    THEME_CHANGED: 'theme_changed',
    NOTIFICATION_SETTINGS_CHANGED: 'notification_settings_changed',

    // ===== Survey events =====
    SURVEY_STARTED: 'survey_started',
    SURVEY_STEP_COMPLETED: 'survey_step_completed',
    SURVEY_STEP_SKIPPED: 'survey_step_skipped',
    SURVEY_COMPLETED: 'survey_completed',
    SURVEY_ABANDONED: 'survey_abandoned',

    // ===== Subscription & Payment events =====
    SUBSCRIPTION_STARTED: 'subscription_started',
    SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
    PAYWALL_VIEWED: 'paywall_viewed',
    CHECKOUT_STARTED: 'checkout_started',
    CHECKOUT_COMPLETED: 'checkout_completed',
    CHECKOUT_FAILED: 'checkout_failed',
    FREE_TRIAL_STARTED: 'free_trial_started',

    // ===== Flashcards events =====
    FLASHCARD_DECK_OPENED: 'flashcard_deck_opened',
    FLASHCARD_REVIEWED: 'flashcard_reviewed',
    FLASHCARD_MARKED_KNOWN: 'flashcard_marked_known',
    FLASHCARD_MARKED_UNKNOWN: 'flashcard_marked_unknown',

    // ===== System Design events =====
    SYSTEM_DESIGN_STARTED: 'system_design_started',
    SYSTEM_DESIGN_DIAGRAM_CREATED: 'system_design_diagram_created',
    SYSTEM_DESIGN_AI_FEEDBACK: 'system_design_ai_feedback',

    // ===== Editor events =====
    EDITOR_LANGUAGE_CHANGED: 'editor_language_changed',
    EDITOR_THEME_CHANGED: 'editor_theme_changed',
    CODE_COPIED: 'code_copied',
    CODE_PASTED: 'code_pasted',

    // ===== Navigation & Feature discovery =====
    FEATURE_DISCOVERED: 'feature_discovered',
    SETTINGS_CHANGED: 'settings_changed',
    FEEDBACK_SUBMITTED: 'feedback_submitted',
    ERROR_ENCOUNTERED: 'error_encountered',

    // ===== Demo Mode & Onboarding events =====
    DEMO_STARTED: 'demo_started',
    DEMO_TOUR_STARTED: 'demo_tour_started',
    DEMO_TOUR_STEP_VIEWED: 'demo_tour_step_viewed',
    DEMO_TOUR_COMPLETED: 'demo_tour_completed',
    DEMO_TOUR_SKIPPED: 'demo_tour_skipped',
    DEMO_PROBLEM_ATTEMPTED: 'demo_problem_attempted',
    DEMO_PROBLEM_SOLVED: 'demo_problem_solved',
    DEMO_COMPLETED: 'demo_completed',

    // ===== Onboarding Tour events (post-signup) =====
    ONBOARDING_TOUR_STARTED: 'onboarding_tour_started',
    ONBOARDING_TOUR_STEP_VIEWED: 'onboarding_tour_step_viewed',
    ONBOARDING_TOUR_COMPLETED: 'onboarding_tour_completed',
    ONBOARDING_TOUR_SKIPPED: 'onboarding_tour_skipped',
    ONBOARDING_TOURS_RESET: 'onboarding_tours_reset',
} as const;

// ===== Helper functions for tracking with rich context =====

/**
 * Track when a user starts working on a problem
 */
export const trackProblemStarted = (problemId: string, problemTitle: string, difficulty: string, category: string) => {
    console.log('trackProblemStarted', problemId, problemTitle, difficulty, category);
    trackEvent(AnalyticsEvents.PROBLEM_STARTED, {
        problem_id: problemId,
        problem_title: problemTitle,
        difficulty,
        category,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track code execution
 */
export const trackCodeRun = (problemId: string, language: string, passed: boolean, executionTime?: number) => {
    trackEvent(AnalyticsEvents.CODE_RUN, {
        problem_id: problemId,
        language,
        passed,
        execution_time_ms: executionTime,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track AI chat interaction
 */
export const trackAIChatMessage = (problemId: string, messageLength: number, isUserMessage: boolean) => {
    console.log('trackAIChatMessage', problemId, messageLength, isUserMessage);
    trackEvent(AnalyticsEvents.AI_CHAT_MESSAGE_SENT, {
        problem_id: problemId,
        message_length: messageLength,
        is_user_message: isUserMessage,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track survey step completion
 */
export const trackSurveyStep = (stepNumber: number, answer: string, timeSpentMs?: number) => {
    trackEvent(AnalyticsEvents.SURVEY_STEP_COMPLETED, {
        step_number: stepNumber,
        answer,
        time_spent_ms: timeSpentMs,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track errors for debugging
 */
export const trackError = (errorType: string, errorMessage: string, context?: Record<string, unknown>) => {
    trackEvent(AnalyticsEvents.ERROR_ENCOUNTERED, {
        error_type: errorType,
        error_message: errorMessage,
        ...context,
        timestamp: new Date().toISOString(),
    });
};

// ===== COACH MODE TRACKING HELPERS =====

/**
 * Track when coach mode is enabled
 */
export const trackCoachModeEnabled = (problemId: string) => {
    console.log('trackCoachModeEnabled', problemId);
    trackEvent(AnalyticsEvents.COACH_MODE_ENABLED, {
        problem_id: problemId,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track when a coach step is prompted to the user
 */
export const trackCoachStepPrompted = (problemId: string, stepId: string | number) => {
    console.log('trackCoachStepPrompted', problemId, stepId);
    trackEvent(AnalyticsEvents.COACH_STEP_PROMPTED, {
        problem_id: problemId,
        step_id: String(stepId),
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track when a coach step is submitted
 */
export const trackCoachStepSubmitted = (
    problemId: string,
    stepId: string | number,
    attemptNumber: number,
    timeToSubmitMs?: number
) => {
    console.log('trackCoachStepSubmitted', problemId, stepId, attemptNumber, timeToSubmitMs);
    trackEvent(AnalyticsEvents.COACH_STEP_SUBMITTED, {
        problem_id: problemId,
        step_id: String(stepId),
        attempt_number: attemptNumber,
        time_to_submit_ms: timeToSubmitMs,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track when a coach step is answered correctly
 */
export const trackCoachStepCorrect = (
    problemId: string,
    stepId: string | number,
    attemptNumber: number,
    timeToSubmitMs?: number
) => {
    console.log('trackCoachStepCorrect', problemId, stepId, attemptNumber, timeToSubmitMs);
    trackEvent(AnalyticsEvents.COACH_STEP_CORRECT, {
        problem_id: problemId,
        step_id: String(stepId),
        attempt_number: attemptNumber,
        time_to_submit_ms: timeToSubmitMs,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track when a coach step is answered incorrectly
 */
export const trackCoachStepIncorrect = (
    problemId: string,
    stepId: string | number,
    attemptNumber: number,
    timeToSubmitMs?: number
) => {
    console.log('trackCoachStepIncorrect', problemId, stepId, attemptNumber, timeToSubmitMs);
    trackEvent(AnalyticsEvents.COACH_STEP_INCORRECT, {
        problem_id: problemId,
        step_id: String(stepId),
        attempt_number: attemptNumber,
        time_to_submit_ms: timeToSubmitMs,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track when a coach problem is completed
 */
export const trackCoachProblemCompleted = (
    problemId: string,
    stepsCompleted: number,
    totalTimeMs?: number
) => {
    console.log('trackCoachProblemCompleted', problemId, stepsCompleted, totalTimeMs);
    trackEvent(AnalyticsEvents.COACH_PROBLEM_COMPLETED, {
        problem_id: problemId,
        steps_completed: stepsCompleted,
        total_time_ms: totalTimeMs,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track when a coach problem is abandoned
 */
export const trackCoachProblemAbandoned = (
    problemId: string,
    stepsCompleted: number,
    totalTimeMs?: number,
    currentStepId?: string | number
) => {
    console.log('trackCoachProblemAbandoned', problemId, stepsCompleted, totalTimeMs, currentStepId);
    trackEvent(AnalyticsEvents.COACH_PROBLEM_ABANDONED, {
        problem_id: problemId,
        steps_completed: stepsCompleted,
        total_time_ms: totalTimeMs,
        current_step_id: currentStepId ? String(currentStepId) : undefined,
        timestamp: new Date().toISOString(),
    });
};

// ===== FEATURE TIMING SYSTEM =====
// Tracks how long users spend on each feature

// Store active feature timers
const featureTimers: Map<string, { startTime: number; feature: string; metadata?: Record<string, unknown> }> = new Map();

// Feature names for consistency
export const Features = {
    // Main features
    CODE_EDITOR: 'code_editor',
    AI_CHAT: 'ai_chat',
    AI_COACHING: 'ai_coaching',
    PROBLEM_DESCRIPTION: 'problem_description',
    TEST_RUNNER: 'test_runner',

    // Pages/Sections
    DASHBOARD: 'dashboard',
    PROBLEMS_LIST: 'problems_list',
    PROBLEM_SOLVER: 'problem_solver',
    FLASHCARDS: 'flashcards',
    BEHAVIORAL: 'behavioral',
    BEHAVIORAL_STORIES: 'behavioral_stories',
    BEHAVIORAL_PRACTICE: 'behavioral_practice',
    MOCK_INTERVIEW: 'mock_interview',
    TECHNICAL_INTERVIEW: 'technical_interview',
    SYSTEM_DESIGN: 'system_design',
    SETTINGS: 'settings',
    SURVEY: 'survey',

    // Sub-features
    VISUALIZATION: 'visualization',
    HINTS: 'hints',
    SOLUTIONS: 'solutions',
} as const;

export type FeatureName = typeof Features[keyof typeof Features];

/**
 * Start timing a feature usage session
 * Call this when user starts interacting with a feature
 */
export const startFeatureTimer = (feature: FeatureName, metadata?: Record<string, unknown>) => {
    const timerId = `${feature}-${Date.now()}`;
    featureTimers.set(feature, {
        startTime: Date.now(),
        feature,
        metadata,
    });

    // Track feature start event
    trackEvent('feature_started', {
        feature,
        ...metadata,
        timestamp: new Date().toISOString(),
    });

    logger.debug('[Analytics] Feature timer started', { feature, metadata });
    return timerId;
};

/**
 * Stop timing a feature and track the duration
 * Call this when user stops interacting with feature
 */
export const stopFeatureTimer = (feature: FeatureName, additionalMetadata?: Record<string, unknown>) => {
    const timer = featureTimers.get(feature);

    if (!timer) {
        logger.debug('[Analytics] No timer found for feature', { feature });
        return null;
    }

    const duration = Date.now() - timer.startTime;
    featureTimers.delete(feature);

    // Track feature usage with duration
    trackEvent('feature_time_spent', {
        feature,
        duration_ms: duration,
        duration_seconds: Math.round(duration / 1000),
        duration_minutes: Math.round(duration / 60000 * 10) / 10, // 1 decimal
        ...timer.metadata,
        ...additionalMetadata,
        timestamp: new Date().toISOString(),
    });

    logger.debug('[Analytics] Feature timer stopped', { feature, duration_ms: duration });
    return duration;
};

/**
 * Get current active features being timed
 */
export const getActiveFeatureTimers = () => {
    return Array.from(featureTimers.keys());
};

/**
 * Track feature engagement depth (how much of a feature they used)
 * E.g., scrolled 80% of problem, used 3 AI messages, ran code 5 times
 */
export const trackFeatureEngagement = (
    feature: FeatureName,
    engagementMetrics: {
        interactionCount?: number;      // How many times they interacted
        completionPercent?: number;     // How much of the feature they completed
        depth?: 'shallow' | 'medium' | 'deep'; // Engagement depth
        [key: string]: unknown;
    }
) => {
    trackEvent('feature_engagement', {
        feature,
        ...engagementMetrics,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track which features are used most in a session
 * Call this periodically or on important events
 */
export const trackFeatureUsageSummary = (
    problemId?: string,
    sessionDuration?: number,
    featuresUsed?: FeatureName[]
) => {
    trackEvent('session_feature_summary', {
        problem_id: problemId,
        session_duration_ms: sessionDuration,
        features_used: featuresUsed || getActiveFeatureTimers(),
        feature_count: (featuresUsed || getActiveFeatureTimers()).length,
        timestamp: new Date().toISOString(),
    });
};

// ===== REACT HOOK HELPER =====
// Use this in components to automatically track feature time

/**
 * Creates callbacks for tracking feature time in React components
 * Usage in a component:
 * 
 * const { onMount, onUnmount } = createFeatureTracker(Features.AI_CHAT, { problemId });
 * useEffect(() => {
 *   onMount();
 *   return onUnmount;
 * }, []);
 */
export const createFeatureTracker = (feature: FeatureName, metadata?: Record<string, unknown>) => ({
    onMount: () => startFeatureTimer(feature, metadata),
    onUnmount: () => stopFeatureTimer(feature),
});

// ===== ONBOARDING TOUR TRACKING HELPERS =====

type OnboardingTourPage = 'dashboard' | 'problems' | 'behavioral' | 'profile';

/**
 * Track when an onboarding tour is started
 */
export const trackOnboardingTourStarted = (page: OnboardingTourPage) => {
    trackEvent(AnalyticsEvents.ONBOARDING_TOUR_STARTED, {
        page,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track when an onboarding tour step is viewed
 */
export const trackOnboardingTourStepViewed = (
    page: OnboardingTourPage,
    step: number,
    totalSteps: number
) => {
    trackEvent(AnalyticsEvents.ONBOARDING_TOUR_STEP_VIEWED, {
        page,
        step,
        total_steps: totalSteps,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track when an onboarding tour is completed
 */
export const trackOnboardingTourCompleted = (
    page: OnboardingTourPage,
    stepsViewed: number
) => {
    trackEvent(AnalyticsEvents.ONBOARDING_TOUR_COMPLETED, {
        page,
        steps_viewed: stepsViewed,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track when an onboarding tour is skipped
 */
export const trackOnboardingTourSkipped = (
    page: OnboardingTourPage,
    stepsViewed: number,
    totalSteps: number
) => {
    trackEvent(AnalyticsEvents.ONBOARDING_TOUR_SKIPPED, {
        page,
        steps_viewed: stepsViewed,
        total_steps: totalSteps,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Track when all onboarding tours are reset (admin action)
 */
export const trackOnboardingToursReset = () => {
    trackEvent(AnalyticsEvents.ONBOARDING_TOURS_RESET, {
        timestamp: new Date().toISOString(),
    });
};
