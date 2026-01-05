import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Sidebar from "@/components/Sidebar";
import { useSubscription } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Monitor, Moon, Sun, LogOut, CheckCircle, ExternalLink, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { notifications } from "@/shared/services/notificationService";
import { logger } from "@/utils/logger";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { useTrackFeatureTime, Features } from '@/hooks/useFeatureTracking';

interface StripeSubscriptionDetails {
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  trial_end: number | null;
}

const Settings = () => {
  useTrackFeatureTime(Features.SETTINGS);

  const { theme, setTheme } = useTheme();
  const { signOut, user } = useAuth();
  const { subscription, hasActiveSubscription, isLoading } = useSubscription();
  const navigate = useNavigate();
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [stripeDetails, setStripeDetails] = useState<StripeSubscriptionDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      notifications.success("Successfully logged out");
      navigate("/");
    } catch (error) {
      notifications.error("Failed to log out");
      logger.error('[Settings] Logout error', { error });
    }
  };

  const handleManageBilling = async () => {
    if (!user) return;

    setIsLoadingBilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-customer-portal', {
        body: { return_url: window.location.origin + '/settings' }
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      logger.error('[Settings] Error opening billing portal', { error: err });
      notifications.error('Failed to open billing portal. Please try again.');
    } finally {
      setIsLoadingBilling(false);
    }
  };

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
        logger.error('[Settings] Error fetching subscription details', { error });
        return;
      }

      setStripeDetails(data);
    } catch (err) {
      logger.error('[Settings] Error fetching subscription details', { error: err });
    } finally {
      setIsLoadingDetails(false);
    }
  }, [subscription?.stripe_subscription_id]);

  useEffect(() => {
    if (subscription?.stripe_subscription_id) {
      fetchStripeSubscriptionDetails();
    }
  }, [subscription?.stripe_subscription_id, fetchStripeSubscriptionDetails]);

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-stone-100 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 flex">
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 py-10 px-8">
        {/* Single Settings Card */}
        <div className="w-full max-w-[900px] bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200/60 dark:border-stone-800/60">

          {/* Card Header */}
          <div className="px-8 pt-8 pb-6">
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
              Settings
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Customize your SimplyAlgo experience
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-stone-100 dark:border-stone-800" />

          {/* Account & Subscription Section */}
          <div className="px-8 py-6">
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-5">
              Account & Subscription
            </h2>

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                Loading subscription...
              </div>
            ) : hasActiveSubscription ? (
              <div className="space-y-4">
                {/* Plan Info */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-medium text-stone-900 dark:text-stone-100">
                        {subscription?.plan ? `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan` : 'Premium Plan'}
                      </span>
                      {subscription?.status === 'trialing' ? (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100">
                          <Calendar className="w-3 h-3 mr-1" />
                          Trial
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 mt-3 text-sm text-stone-500 dark:text-stone-400">
                      <div className="flex gap-6">
                        <span>
                          Started: <span className="text-stone-700 dark:text-stone-300">{subscription?.created_at ? formatDate(subscription.created_at) : 'N/A'}</span>
                        </span>
                        <span>
                          Last updated: <span className="text-stone-700 dark:text-stone-300">{subscription?.updated_at ? formatDate(subscription.updated_at) : 'N/A'}</span>
                        </span>
                      </div>
                      {subscription?.status === 'trialing' && stripeDetails?.trial_end && new Date(stripeDetails.trial_end * 1000) > new Date() && (
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Trial ends on <span className="font-medium">{formatTimestamp(stripeDetails.trial_end)}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Manage Billing Button */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={handleManageBilling}
                    disabled={isLoadingBilling}
                    className="text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600"
                  >
                    {isLoadingBilling ? 'Loading...' : 'Manage Billing'}
                    <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-50" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  You don't have an active subscription.
                </p>
                <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                  <Link to="/survey/20">Upgrade to Premium</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-stone-100 dark:border-stone-800" />

          {/* Appearance Section */}
          <div className="px-8 py-6">
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-5">
              Appearance
            </h2>

            <RadioGroup
              value={theme}
              onValueChange={setTheme}
              className="flex gap-3"
            >
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;
                return (
                  <div key={option.value} className="relative">
                    <RadioGroupItem
                      value={option.value}
                      id={`theme-${option.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`theme-${option.value}`}
                      className={`
                        flex items-center gap-2.5 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all duration-150
                        ${isSelected
                          ? 'border-green-500 bg-green-50/50 dark:bg-green-950/30 shadow-[0_0_0_3px_rgba(34,197,94,0.08)]'
                          : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-750'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-green-600 dark:text-green-400' : 'text-stone-400 dark:text-stone-500'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-green-700 dark:text-green-300' : 'text-stone-600 dark:text-stone-300'}`}>
                        {option.label}
                      </span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Divider */}
          <div className="border-t border-stone-100 dark:border-stone-800" />

          {/* Legal Section */}
          <div className="px-8 py-6">
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-4">
              Legal
            </h2>

            <div className="flex gap-6">
              <Link
                to="/terms"
                className="text-sm text-stone-500 dark:text-stone-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                to="/privacy"
                className="text-sm text-stone-500 dark:text-stone-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-stone-100 dark:border-stone-800" />

          {/* Session / Logout Section */}
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                  Session
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                  Sign out of your account on this device
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-300 hover:border-rose-300 dark:hover:border-rose-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
