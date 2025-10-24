import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasActiveSubscription, isLoading: subscriptionLoading, subscription } = useSubscription();
  const location = useLocation();

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
    console.log("No user, redirecting to auth");
    return <Navigate to="/" replace />;
  }

  // If user exists but subscription is still loading, show loading
  if (subscriptionLoading) {
    console.log("Subscription loading, showing loading spinner");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Now we know user is authenticated and subscription state is loaded
  // If user has subscription and is on survey page, redirect to dashboard
  if (hasActiveSubscription && isSurveyPage) {
    console.log("User has subscription and is on survey page, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // If user doesn't have subscription and is on protected page, redirect to survey
  if (!hasActiveSubscription && !isPublicPage) {
    console.log("User doesn't have subscription and is on protected page, redirecting to survey");
    return <Navigate to="/survey/1" replace />;
  }

  // If user has subscription and is on survey page, don't render (will redirect)
  if (hasActiveSubscription && isSurveyPage) {
    console.log("User has subscription and is on survey page, don't render");
    return null;
  }

  // If user doesn't have subscription and is on protected page, don't render (will redirect)
  if (!hasActiveSubscription && !isPublicPage) {
    console.log("User doesn't have subscription and is on protected page, don't render");
    return null;
  }
  console.log("User has subscription and is on protected page, rendering children");
  // Render children if user has subscription (and not on survey) or is on public page
  return <>{children}</>;
};
