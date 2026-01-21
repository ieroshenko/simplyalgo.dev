import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SurveyStepProps } from '@/types/survey';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft, Sparkles, ShieldCheck, Zap, TrendingUp, Infinity as InfinityIcon, Loader2 } from 'lucide-react';
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

  const handlePaymentSuccess = useCallback(() => {
    onAnswer('payment_completed');
    onPaymentSuccess?.();
    // Redirect to dashboard after successful payment
    window.location.href = '/dashboard';
  }, [onAnswer, onPaymentSuccess]);

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
  }, [handlePaymentSuccess]);

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[PaywallStep] Error creating checkout session', { error });

      // Check if user already has an active subscription
      if (errorMessage.includes('already has an active subscription')) {
        // User already has subscription, redirect to dashboard
        window.location.href = '/dashboard';
        return;
      }
      
      handlePaymentError(`Failed to create checkout session: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };


  // Show embedded checkout if we have a client secret
  if (showCheckout && clientSecret) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-8"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100 mb-2 tracking-tight">
            Complete Your Subscription
          </h1>
          <p className="text-muted-foreground text-lg">
            You're almost there! Complete your payment to unlock SimplyAlgo.
          </p>
        </div>
        
        <div className="flex-1 min-h-[600px] bg-white dark:bg-zinc-900 rounded-[2.5rem] p-4 md:p-8 shadow-2xl border border-emerald-100 dark:border-emerald-900/30 overflow-hidden relative">
          <div className="w-full h-full min-h-[600px]">
            {checkoutError ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">Checkout failed to load</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">Please try our secure redirect checkout instead.</p>
                </div>
                <Button
                  onClick={() => {
                    window.location.href = `${window.location.origin}/stripe-checkout?plan=${selectedPlan}`;
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 rounded-full font-bold shadow-lg"
                >
                  Continue with Redirect Checkout
                </Button>
              </div>
            ) : (
              <div className="relative z-10">
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
              </div>
            )}
          </div>
          
          {/* Loading backdrop that shows until Stripe loads */}
          {!checkoutError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm pointer-events-none z-0">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Loading secure checkout...</p>
            </div>
          )}
        </div>
        
        <div className="mt-10 text-center">
          <Button
            variant="ghost"
            onClick={() => {
              setShowCheckout(false);
              setClientSecret(null);
            }}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Plans
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8"
    >
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-800 dark:text-zinc-100 mb-4 tracking-tight leading-tight">
          Unlock SimplyAlgo to reach your goals faster.
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Join engineers crushing their interviews with personalized prep.
        </p>
      </div>

      {/* Benefits Card */}
      <div className="bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-900/30 rounded-[2rem] p-6 md:p-8 shadow-xl shadow-emerald-500/5 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0 text-emerald-600">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-zinc-800 dark:text-zinc-200">Personalized Plan</p>
              <p className="text-sm text-muted-foreground">Tailored roadmap based on your survey answers.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0 text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-zinc-800 dark:text-zinc-200">AI Coaching</p>
              <p className="text-sm text-muted-foreground">First-principle hints and real-time feedback.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center flex-shrink-0 text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-zinc-800 dark:text-zinc-200">Detailed Analytics</p>
              <p className="text-sm text-muted-foreground">Track your readiness and identify bottlenecks.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center flex-shrink-0 text-amber-600">
              <InfinityIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-zinc-800 dark:text-zinc-200">Lifetime Access</p>
              <p className="text-sm text-muted-foreground">All features included in your subscription.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Monthly Plan */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`p-6 border-2 rounded-[2rem] cursor-pointer transition-all relative ${
            selectedPlan === 'monthly'
              ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10 shadow-lg shadow-emerald-500/10'
              : 'border-emerald-100/50 dark:border-emerald-900/20 bg-white dark:bg-zinc-900 hover:border-emerald-200'
          }`}
          onClick={() => setSelectedPlan('monthly')}
        >
          {isEligibleForTrial ? (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-zinc-900 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full shadow-lg">
                7 Days Free
              </div>
            </div>
          ) : (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-zinc-200 text-zinc-600 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                Standard
              </div>
            </div>
          )}
          
          <div className="flex flex-col items-center text-center">
            <h3 className="font-bold text-zinc-500 uppercase tracking-tighter text-sm mb-2">Monthly</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-extrabold text-zinc-800 dark:text-zinc-100">$20</span>
              <span className="text-zinc-500 font-medium">/mo</span>
            </div>
            <p className="text-xs text-zinc-400 font-medium italic">Billed monthly</p>
          </div>

          <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            selectedPlan === 'monthly' 
              ? 'border-emerald-600 bg-emerald-600' 
              : 'border-zinc-200 dark:border-zinc-800'
          }`}>
            {selectedPlan === 'monthly' && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
          </div>
        </motion.div>

        {/* Yearly Plan */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`p-6 border-2 rounded-[2rem] cursor-pointer transition-all relative ${
            selectedPlan === 'yearly'
              ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10 shadow-lg shadow-emerald-500/10'
              : 'border-emerald-100/50 dark:border-emerald-900/20 bg-white dark:bg-zinc-900 hover:border-emerald-200'
          }`}
          onClick={() => setSelectedPlan('yearly')}
        >
          {isEligibleForTrial ? (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-emerald-600 text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 fill-current" />
                Best Value • 3 Days Free
              </div>
            </div>
          ) : (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-emerald-600 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                Most Popular
              </div>
            </div>
          )}
          
          <div className="flex flex-col items-center text-center">
            <h3 className="font-bold text-zinc-500 uppercase tracking-tighter text-sm mb-2">Yearly</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-extrabold text-zinc-800 dark:text-zinc-100">$10</span>
              <span className="text-zinc-500 font-medium">/mo</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Save 50% ($120/year)</p>
          </div>

          <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            selectedPlan === 'yearly' 
              ? 'border-emerald-600 bg-emerald-600' 
              : 'border-zinc-200 dark:border-zinc-800'
          }`}>
            {selectedPlan === 'yearly' && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
          </div>
        </motion.div>
      </div>

      {/* Action Section */}
      <div className="space-y-6">
        <Button
          onClick={createCheckoutSession}
          disabled={isLoading}
          className="w-full h-16 rounded-full text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Redirecting to secure checkout...
            </>
          ) : (
            'Start My Journey'
          )}
        </Button>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Secure Payment
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Check className="w-4 h-4 text-emerald-500" />
              Cancel Anytime
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Check className="w-4 h-4 text-emerald-500" />
              7-Day Money Back
            </div>
          </div>
          
          <p className="text-xs text-zinc-400 max-w-sm text-center leading-relaxed">
            By clicking "Start My Journey", you agree to our Terms of Service. Billed as one payment of $120/year or $20/month.
          </p>
        </div>

        {/* Back Button */}
        <div className="pt-4 flex justify-center">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to custom plan
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
