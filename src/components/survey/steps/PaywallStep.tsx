import React, { useState, useEffect } from 'react';
import { SurveyStepProps } from '@/types/survey';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useTrialEligibility } from '@/hooks/useTrialEligibility';
import { logger } from '@/utils/logger';

interface PaywallStepProps extends SurveyStepProps {
  onPaymentSuccess?: () => void;
  onPaymentError?: (error: string) => void;
}

// Initialize Stripe
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
logger.info('[PaywallStep] Stripe publishable key status', { status: stripePublishableKey ? 'Loaded' : 'Missing' });
const stripePromise = loadStripe(stripePublishableKey!);

export const PaywallStep: React.FC<PaywallStepProps> = (props) => {
  const { onAnswer, onBack, onPaymentSuccess, onPaymentError } = props;
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const { isEligibleForTrial, isLoading: trialLoading } = useTrialEligibility();

  const handlePaymentSuccess = () => {
    onAnswer('payment_completed');
    onPaymentSuccess?.();
    // Redirect to dashboard after successful payment
    window.location.href = '/dashboard';
  };

  const handlePaymentError = (error: string) => {
    onPaymentError?.(error);
  };

  // Handle successful payment completion
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const paymentStatus = urlParams.get('payment');
    
    if (sessionId && paymentStatus === 'success') {
      // Payment was successful, redirect to dashboard
      handlePaymentSuccess();
    }
  }, []);

  const createCheckoutSession = async () => {
    setIsLoading(true);
    
    try {
      logger.info('[PaywallStep] Creating checkout session', { plan: selectedPlan });
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      logger.debug('[PaywallStep] User session found', { email: session.user?.email });

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          plan: selectedPlan,
          return_url: `${window.location.origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      logger.debug('[PaywallStep] Stripe checkout response', { data, error });

      if (error) {
        throw error;
      }

      if (data?.clientSecret) {
        logger.info('[PaywallStep] Client secret received, showing checkout');
        setClientSecret(data.clientSecret);
        setShowCheckout(true);
        setCheckoutError(null);
      } else if (data?.url) {
        // Fallback to redirect-based checkout
        logger.info('[PaywallStep] Redirecting to Stripe checkout');
        window.location.href = data.url;
      } else {
        throw new Error('No client secret or URL received');
      }
    } catch (error: any) {
      logger.error('[PaywallStep] Error creating checkout session', { error });
      
      // Check if user already has an active subscription
      if (error.message && error.message.includes('already has an active subscription')) {
        // User already has subscription, redirect to dashboard
        window.location.href = '/dashboard';
        return;
      }
      
      handlePaymentError(`Failed to create checkout session: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };


  // Show embedded checkout if we have a client secret
  if (showCheckout && clientSecret) {
    return (
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Complete Your Subscription
          </h1>
          <p className="text-muted-foreground">
            You're almost there! Complete your payment to unlock SimplyAlgo.
          </p>
        </div>
        
        <div className="flex-1 min-h-0">
          <div className="w-full h-full min-h-[600px]">
            {checkoutError ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-red-600 mb-4">Embedded checkout failed to load</p>
                <Button
                  onClick={() => {
                    // Try redirect-based checkout as fallback
                    window.location.href = `${window.location.origin}/stripe-checkout?plan=${selectedPlan}`;
                  }}
                  className="bg-primary text-primary-foreground"
                >
                  Continue with Redirect Checkout
                </Button>
              </div>
            ) : (
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ 
                  clientSecret,
                  onComplete: () => {
                    logger.info('[PaywallStep] Payment completed successfully');
                    handlePaymentSuccess();
                  }
                }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            )}
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => {
              setShowCheckout(false);
              setClientSecret(null);
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-4">
          Unlock SimplyAlgo to reach your goals faster.
        </h1>
      </div>

      {/* Benefits */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-foreground">Personalized learning plan based on your survey</span>
        </div>
        <div className="flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-foreground">AI-powered coaching and feedback</span>
        </div>
        <div className="flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-foreground">Track your progress with detailed analytics</span>
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Monthly Plan */}
        <div
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
            selectedPlan === 'monthly'
              ? 'border-primary bg-primary/5 dark:bg-primary/10'
              : 'border-border bg-card hover:bg-muted/50'
          }`}
          onClick={() => setSelectedPlan('monthly')}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-medium text-foreground">Monthly</h3>
              <p className="text-2xl font-bold text-foreground">$20.00</p>
              <p className="text-sm text-muted-foreground">/mo</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selectedPlan === 'monthly' 
                ? 'border-primary bg-primary' 
                : 'border-muted-foreground'
            }`}>
              {selectedPlan === 'monthly' && <div className="w-2 h-2 bg-primary-foreground rounded-full" />}
            </div>
          </div>
        </div>

        {/* Yearly Plan */}
        <div
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all relative ${
            selectedPlan === 'yearly'
              ? 'border-primary bg-primary/5 dark:bg-primary/10'
              : 'border-border bg-card hover:bg-muted/50'
          }`}
          onClick={() => setSelectedPlan('yearly')}
        >
          {isEligibleForTrial ? (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                3 DAYS FREE
              </div>
            </div>
          ) : (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <div className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded">
                NO TRIAL
              </div>
            </div>
          )}
          <div className="flex justify-between items-start mb-2 mt-2">
            <div>
              <h3 className="font-medium text-foreground">Yearly</h3>
              <p className="text-2xl font-bold text-foreground">$10.00</p>
              <p className="text-sm text-muted-foreground">/mo</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selectedPlan === 'yearly' 
                ? 'border-primary bg-primary' 
                : 'border-muted-foreground'
            }`}>
              {selectedPlan === 'yearly' && <div className="w-2 h-2 bg-primary-foreground rounded-full" />}
            </div>
          </div>
        </div>
      </div>

      {/* No Commitment */}
      <div className="flex items-center gap-2 mb-6">
        <Check className="w-4 h-4 text-green-600" />
        <span className="text-sm text-muted-foreground">No Commitment - Cancel Anytime</span>
      </div>

      {/* Start Journey Button */}
      <Button
        onClick={createCheckoutSession}
        disabled={isLoading}
        className="w-full py-4 text-lg font-medium"
        size="lg"
      >
        {isLoading ? 'Redirecting to Payment...' : 'Start My Journey'}
      </Button>

      {/* Price Summary */}
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          {selectedPlan === 'monthly' 
            ? 'Just $20.00 per month' 
            : 'Just $10.00 per month, billed annually'
          }
        </p>
      </div>

      {/* Back Button */}
      <div className="mt-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>
    </div>
  );
};