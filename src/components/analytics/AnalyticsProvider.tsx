import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics, identifyUser, trackEvent, AnalyticsEvents, resetAnalytics } from '@/services/analytics';
import { useAuth } from '@/hooks/useAuth';

/**
 * Analytics Provider component
 * 
 * With FULL tracking enabled, PostHog automatically captures:
 * ✓ All button clicks, link clicks
 * ✓ All form inputs and submissions  
 * ✓ Page views and navigation
 * ✓ Time spent on each page
 * ✓ Scroll depth
 * ✓ Session recordings (visual replay of user sessions)
 * ✓ Click heatmaps
 * ✓ Performance metrics (load times, web vitals)
 * 
 * This component handles:
 * - Initializing analytics on app load
 * - Identifying users when they log in
 * - Resetting analytics on logout
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const { user } = useAuth();

    // Initialize analytics on mount
    useEffect(() => {
        initAnalytics();
    }, []);

    // Identify user when they log in, reset when they log out
    useEffect(() => {
        if (user?.id) {
            // Identify the user with all available properties
            identifyUser(user.id, {
                email: user.email,
                created_at: user.created_at,
                email_confirmed_at: user.email_confirmed_at,
                last_sign_in_at: user.last_sign_in_at,
                // Add any other user properties you want to track
            });

            // Track login event
            trackEvent(AnalyticsEvents.USER_LOGGED_IN, {
                userId: user.id,
                email: user.email,
            });
        } else {
            // User logged out - reset analytics to stop associating events with them
            resetAnalytics();
        }
    }, [user?.id, user?.email, user?.created_at, user?.email_confirmed_at, user?.last_sign_in_at]);

    // Track route changes for custom navigation analytics
    // (PostHog autocapture handles basic pageviews, but this adds extra context)
    useEffect(() => {
        // Extract useful info from the path
        const pathParts = location.pathname.split('/').filter(Boolean);
        const section = pathParts[0] || 'home';

        // Track navigation with rich context
        trackEvent('page_navigation', {
            path: location.pathname,
            search: location.search,
            section: section,
            // Add any route-specific metadata
            ...(section === 'problems' && pathParts[1] && { problemSlug: pathParts[1] }),
            ...(section === 'survey' && pathParts[1] && { surveyStep: parseInt(pathParts[1]) }),
            ...(section === 'behavioral' && pathParts[1] && { behavioralPage: pathParts[1] }),
        });
    }, [location.pathname, location.search]);

    return <>{children}</>;
}
