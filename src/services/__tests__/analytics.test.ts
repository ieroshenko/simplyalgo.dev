import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock posthog-js
const mockCapture = vi.fn();
const mockIdentify = vi.fn();
const mockReset = vi.fn();
const mockInit = vi.fn();
const mockDebug = vi.fn();
const mockStartSessionRecording = vi.fn();

vi.mock('posthog-js', () => ({
    default: {
        init: (key: string, options: Record<string, unknown>) => {
            mockInit(key, options);
            // Simulate the loaded callback
            if (options.loaded && typeof options.loaded === 'function') {
                options.loaded({
                    debug: mockDebug,
                    startSessionRecording: mockStartSessionRecording,
                });
            }
        },
        capture: mockCapture,
        identify: mockIdentify,
        reset: mockReset,
    },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

describe('Analytics Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset module state between tests
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('initAnalytics', () => {
        it('should initialize PostHog with correct configuration when key is provided', async () => {
            // Stub environment variables
            vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key_12345');
            vi.stubEnv('VITE_POSTHOG_HOST', 'https://us.i.posthog.com');

            // Import fresh module
            const { initAnalytics } = await import('../analytics');

            initAnalytics();

            expect(mockInit).toHaveBeenCalledTimes(1);
            expect(mockInit).toHaveBeenCalledWith(
                'phc_test_key_12345',
                expect.objectContaining({
                    api_host: 'https://us.i.posthog.com',
                    autocapture: true,
                    capture_pageview: true,
                    capture_pageleave: true,
                    enable_heatmaps: true,
                    capture_performance: true,
                })
            );
        });

        it('should not initialize when no key is provided', async () => {
            vi.stubEnv('VITE_POSTHOG_KEY', '');

            const { initAnalytics } = await import('../analytics');

            initAnalytics();

            expect(mockInit).not.toHaveBeenCalled();
        });

        it('should not initialize when key does not start with phc_', async () => {
            vi.stubEnv('VITE_POSTHOG_KEY', 'invalid_key');

            const { initAnalytics } = await import('../analytics');

            initAnalytics();

            expect(mockInit).not.toHaveBeenCalled();
        });

        it('should only initialize once even if called multiple times', async () => {
            vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key_12345');

            const { initAnalytics } = await import('../analytics');

            initAnalytics();
            initAnalytics();
            initAnalytics();

            expect(mockInit).toHaveBeenCalledTimes(1);
        });

        it('should start session recording after initialization', async () => {
            vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key_12345');

            const { initAnalytics } = await import('../analytics');

            initAnalytics();

            expect(mockStartSessionRecording).toHaveBeenCalled();
        });
    });

    describe('trackEvent', () => {
        it('should capture events after initialization', async () => {
            vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key_12345');

            const { initAnalytics, trackEvent } = await import('../analytics');

            initAnalytics();
            trackEvent('test_event', { foo: 'bar' });

            expect(mockCapture).toHaveBeenCalledWith('test_event', { foo: 'bar' });
        });

        it('should not capture events before initialization', async () => {
            vi.stubEnv('VITE_POSTHOG_KEY', ''); // No key, won't initialize

            const { trackEvent } = await import('../analytics');

            trackEvent('test_event', { foo: 'bar' });

            expect(mockCapture).not.toHaveBeenCalled();
        });
    });

    describe('trackPageview', () => {
        it('should capture pageview with current URL', async () => {
            vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key_12345');

            const { initAnalytics, trackPageview } = await import('../analytics');

            initAnalytics();
            trackPageview('https://simplyalgo.dev/problems/two-sum');

            expect(mockCapture).toHaveBeenCalledWith('$pageview', {
                '$current_url': 'https://simplyalgo.dev/problems/two-sum',
            });
        });
    });

    describe('identifyUser', () => {
        it('should identify user with traits', async () => {
            vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key_12345');

            const { initAnalytics, identifyUser } = await import('../analytics');

            initAnalytics();
            identifyUser('user-123', { email: 'test@example.com' });

            expect(mockIdentify).toHaveBeenCalledWith('user-123', { email: 'test@example.com' });
        });
    });

    describe('resetAnalytics', () => {
        it('should reset analytics state', async () => {
            vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key_12345');

            const { initAnalytics, resetAnalytics } = await import('../analytics');

            initAnalytics();
            resetAnalytics();

            expect(mockReset).toHaveBeenCalled();
        });
    });

    describe('AnalyticsEvents', () => {
        it('should export all expected event names', async () => {
            const { AnalyticsEvents } = await import('../analytics');

            // Auth events
            expect(AnalyticsEvents.USER_SIGNED_UP).toBe('user_signed_up');
            expect(AnalyticsEvents.USER_LOGGED_IN).toBe('user_logged_in');
            expect(AnalyticsEvents.USER_LOGGED_OUT).toBe('user_logged_out');

            // Problem events
            expect(AnalyticsEvents.PROBLEM_STARTED).toBe('problem_started');
            expect(AnalyticsEvents.PROBLEM_COMPLETED).toBe('problem_completed');
            expect(AnalyticsEvents.CODE_RUN).toBe('code_run');

            // AI events
            expect(AnalyticsEvents.AI_CHAT_MESSAGE_SENT).toBe('ai_chat_message_sent');

            // Survey events
            expect(AnalyticsEvents.SURVEY_STEP_COMPLETED).toBe('survey_step_completed');

            // Subscription events
            expect(AnalyticsEvents.CHECKOUT_STARTED).toBe('checkout_started');
            expect(AnalyticsEvents.PAYWALL_VIEWED).toBe('paywall_viewed');
        });
    });

    describe('Helper Functions', () => {
        beforeEach(async () => {
            vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key_12345');
            const { initAnalytics } = await import('../analytics');
            initAnalytics();
        });

        it('trackProblemStarted should capture with rich context', async () => {
            const { trackProblemStarted } = await import('../analytics');

            trackProblemStarted('two-sum', 'Two Sum', 'easy', 'arrays');

            expect(mockCapture).toHaveBeenCalledWith(
                'problem_started',
                expect.objectContaining({
                    problem_id: 'two-sum',
                    problem_title: 'Two Sum',
                    difficulty: 'easy',
                    category: 'arrays',
                })
            );
        });

        it('trackCodeRun should capture execution details', async () => {
            const { trackCodeRun } = await import('../analytics');

            trackCodeRun('two-sum', 'python', true, 150);

            expect(mockCapture).toHaveBeenCalledWith(
                'code_run',
                expect.objectContaining({
                    problem_id: 'two-sum',
                    language: 'python',
                    passed: true,
                    execution_time_ms: 150,
                })
            );
        });

        it('trackSurveyStep should capture step completion', async () => {
            const { trackSurveyStep } = await import('../analytics');

            trackSurveyStep(5, 'Student', 3000);

            expect(mockCapture).toHaveBeenCalledWith(
                'survey_step_completed',
                expect.objectContaining({
                    step_number: 5,
                    answer: 'Student',
                    time_spent_ms: 3000,
                })
            );
        });

        it('trackError should capture error details', async () => {
            const { trackError } = await import('../analytics');

            trackError('network_error', 'Failed to fetch', { endpoint: '/api/test' });

            expect(mockCapture).toHaveBeenCalledWith(
                'error_encountered',
                expect.objectContaining({
                    error_type: 'network_error',
                    error_message: 'Failed to fetch',
                    endpoint: '/api/test',
                })
            );
        });
    });
});
