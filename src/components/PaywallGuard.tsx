import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

interface PaywallGuardProps {
  children: React.ReactNode;
}

export const PaywallGuard: React.FC<PaywallGuardProps> = ({ children }) => {
  const { hasActiveSubscription, isLoading } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  // Pages that don't require subscription
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

  // Check if current path is a survey page (dynamic route)
  const isSurveyPage = location.pathname.startsWith('/survey/');
  const isPublicPage = publicPages.includes(location.pathname) || isSurveyPage;

  useEffect(() => {
    if (!isLoading) {
      // If user has active subscription and is trying to access survey pages, redirect to dashboard
      if (hasActiveSubscription && isSurveyPage) {
        navigate('/dashboard', { replace: true });
        return;
      }
      
      // If user doesn't have active subscription and is trying to access protected page
      if (!hasActiveSubscription && !isPublicPage) {
        navigate('/survey/1', { replace: true });
      }
    }
  }, [hasActiveSubscription, isLoading, isPublicPage, isSurveyPage, navigate, location.pathname]);

  // Show loading spinner while checking subscription
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user has subscription and is on survey page, don't render children (will redirect)
  if (hasActiveSubscription && isSurveyPage) {
    return null;
  }

  // If user doesn't have subscription and is on protected page, don't render children
  if (!hasActiveSubscription && !isPublicPage) {
    return null;
  }

  // Render children if user has subscription (and not on survey) or is on public page
  return <>{children}</>;
};
