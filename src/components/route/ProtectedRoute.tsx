import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { logger } from "@/utils/logger";
import { DEMO_PROBLEM_ID } from "@/features/onboarding/demoTourSteps";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasActiveSubscription, isLoading: subscriptionLoading, subscription } = useSubscription();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Define public pages that don't require subscription
  const publicPages = [
    '/',
    '/survey',
    '/auth',
    '/survey/1',
    '/survey/2',
    '/survey/3',
    '/survey/4',
    '/survey/5',
    '/survey/6',
    '/survey/7',
    '/survey/8',
    '/survey/9',
    '/survey/10',
    '/survey/11',
    '/survey/12',
    '/survey/13',
    '/survey/14',
    '/survey/15',
    '/survey/16',
    '/survey/17',
    '/survey/18',
    '/survey/19',
    '/survey/20',
  ];

  const isSurveyPage = location.pathname.startsWith('/survey/');
  const isPublicPage = publicPages.includes(location.pathname) || isSurveyPage;

  // Check if user is accessing demo mode (allowed without subscription)
  const isDemoMode = searchParams.get('demo') === 'true';
  const isDemoProblemPage = location.pathname === `/problems/${DEMO_PROBLEM_ID}`;
  const isAllowedDemoAccess = isDemoMode && isDemoProblemPage;

  // Check if admin is testing survey flow
  const isAdminSurveyTest = searchParams.get('admin') === 'true';

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user, redirect to auth
  if (!user) {
    logger.debug("[ProtectedRoute] No user, redirecting to auth");
    return <Navigate to="/" replace />;
  }

  // If user exists but subscription is still loading, show loading
  if (subscriptionLoading) {
    logger.debug("[ProtectedRoute] Subscription loading, showing loading spinner");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Now we know user is authenticated and subscription state is loaded
  // If user has subscription and is on survey page, redirect to dashboard
  // Exception: Allow admin to test survey flow with ?admin=true
  if (hasActiveSubscription && isSurveyPage && !isAdminSurveyTest) {
    logger.debug("[ProtectedRoute] User has subscription and is on survey page, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // If user doesn't have subscription and is on protected page, redirect to survey
  // Exception: Allow demo access to the demo problem
  if (!hasActiveSubscription && !isPublicPage && !isAllowedDemoAccess) {
    logger.debug("[ProtectedRoute] User doesn't have subscription and is on protected page, redirecting to survey");
    return <Navigate to="/survey/1" replace />;
  }

  // If user has subscription and is on survey page, don't render (will redirect)
  // Exception: Allow admin to test survey flow with ?admin=true
  if (hasActiveSubscription && isSurveyPage && !isAdminSurveyTest) {
    logger.debug("[ProtectedRoute] User has subscription and is on survey page, don't render");
    return null;
  }

  // If user doesn't have subscription and is on protected page, don't render (will redirect)
  // Exception: Allow demo access to the demo problem
  if (!hasActiveSubscription && !isPublicPage && !isAllowedDemoAccess) {
    logger.debug("[ProtectedRoute] User doesn't have subscription and is on protected page, don't render");
    return null;
  }
  logger.debug("[ProtectedRoute] User has subscription and is on protected page, rendering children");
  // Render children if user has subscription (and not on survey) or is on public page
  return <>{children}</>;
};
