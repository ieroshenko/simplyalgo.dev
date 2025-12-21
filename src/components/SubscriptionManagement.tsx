import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Calendar, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/uiUtils';

interface StripeSubscriptionDetails {
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  trial_end: number | null;
}

export const SubscriptionManagement: React.FC = () => {
  const { subscription, hasActiveSubscription, isLoading } = useSubscription();
  const { user } = useAuth();
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stripeDetails, setStripeDetails] = useState<StripeSubscriptionDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchStripeSubscriptionDetails = useCallback(async () => {
    if (!subscription?.stripe_subscription_id) return;

    setIsLoadingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-get-subscription-details', {
        body: {
          subscription_id: subscription.stripe_subscription_id
        }
      });

      if (error) {
        logger.error('[SubscriptionManagement] Error fetching subscription details', { error });
        return;
      }

      setStripeDetails(data);
    } catch (err) {
      logger.error('[SubscriptionManagement] Error fetching subscription details', { error: err });
    } finally {
      setIsLoadingDetails(false);
    }
  }, [subscription?.stripe_subscription_id]);

  useEffect(() => {
    if (subscription?.stripe_subscription_id) {
      fetchStripeSubscriptionDetails();
    }
  }, [subscription?.stripe_subscription_id, fetchStripeSubscriptionDetails]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'trialing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'trialing':
        return <Calendar className="w-4 h-4" />;
      case 'past_due':
        return <AlertCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setIsLoadingAction(true);
    setError(null);
    setSuccess(null);

    try {
      // Create a Stripe customer portal session
      const { data, error } = await supabase.functions.invoke('stripe-customer-portal', {
        body: {
          return_url: window.location.origin + '/settings'
        }
      });

      if (error) {
        logger.error('[SubscriptionManagement] Function error', { error });
        if (error.message?.includes('No active subscription found')) {
          setError('No active subscription found. Please contact support if you believe this is an error.');
        } else if (error.message?.includes('Customer portal not configured')) {
          setError('Subscription management is temporarily unavailable. Please contact support for assistance.');
        } else {
          throw error;
        }
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError('Failed to get customer portal URL. Please try again.');
      }
    } catch (err: unknown) {
      logger.error('[SubscriptionManagement] Error creating customer portal session', { error: err });
      const errorMessage = getErrorMessage(err, '');
      if (errorMessage.includes('No active subscription found')) {
        setError('No active subscription found. Please contact support if you believe this is an error.');
      } else if (errorMessage.includes('Customer portal not configured')) {
        setError('Subscription management is temporarily unavailable. Please contact support for assistance.');
      } else {
        setError('Failed to open subscription management. Please try again.');
      }
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscription) return;

    setIsLoadingAction(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.functions.invoke('stripe-cancel-subscription', {
        body: {
          subscription_id: subscription.stripe_subscription_id
        }
      });

      if (error) {
        throw error;
      }

      setSuccess('Subscription cancelled successfully. You will retain access until the end of your billing period.');
      // Refresh subscription details to show updated cancellation info
      await fetchStripeSubscriptionDetails();
    } catch (err) {
      logger.error('[SubscriptionManagement] Error cancelling subscription', { error: err });
      setError('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setIsLoadingAction(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Subscription</span>
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasActiveSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Subscription</span>
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              You don't have an active subscription.
            </div>
            <Button asChild>
              <a href="/survey/20">Upgrade to Premium</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>Subscription</span>
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Current Plan</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {subscription?.plan} Plan
              </p>
            </div>
            <Badge className={getStatusColor(subscription?.status || '')}>
              <div className="flex items-center space-x-1">
                {getStatusIcon(subscription?.status || '')}
                <span className="capitalize">{subscription?.status}</span>
              </div>
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Started:</span>
              <p className="font-medium">
                {subscription?.created_at ? formatDate(subscription.created_at) : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Last Updated:</span>
              <p className="font-medium">
                {subscription?.updated_at ? formatDate(subscription.updated_at) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Subscription End Date and Cancellation Info */}
          {stripeDetails && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              {stripeDetails.cancel_at_period_end ? (
                <div className="flex items-start space-x-2">
                  <Clock className="w-4 h-4 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-700 dark:text-orange-300">
                      {stripeDetails.trial_end && new Date(stripeDetails.trial_end * 1000) > new Date()
                        ? `Trial will end on ${formatTimestamp(stripeDetails.current_period_end)}`
                        : `Subscription will end on ${formatTimestamp(stripeDetails.current_period_end)}`
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You will not be charged after this date. Access will continue until then.
                    </p>
                  </div>
                </div>
              ) : stripeDetails.trial_end && new Date(stripeDetails.trial_end * 1000) > new Date() ? (
                <div className="flex items-start space-x-2">
                  <Calendar className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-700 dark:text-blue-300">
                      Trial ends on {formatTimestamp(stripeDetails.trial_end)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your subscription will automatically start after the trial period.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start space-x-2">
                  <Calendar className="w-4 h-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">
                      Next billing date: {formatTimestamp(stripeDetails.current_period_end)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your subscription will automatically renew on this date.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {isLoadingDetails && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground">Loading subscription details...</span>
            </div>
          )}

          <div className="flex space-x-3">
            <Button
              onClick={handleManageSubscription}
              disabled={isLoadingAction}
              variant="outline"
            >
              {isLoadingAction ? 'Loading...' : 'Manage Billing'}
            </Button>

            {/* {subscription?.status === 'active' && (
              <Button 
                onClick={handleCancelSubscription}
                disabled={isLoadingAction}
                variant="destructive"
              >
                {isLoadingAction ? 'Processing...' : 'Cancel Subscription'}
              </Button>
            )} */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
