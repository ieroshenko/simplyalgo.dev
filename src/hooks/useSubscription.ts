import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from "@/utils/logger";
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';

type UserSubscription = Tables<'user_subscriptions'>;

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
          logger.error('Error fetching subscription:', { error, component: 'useSubscription' });
        }
        setSubscription(data);
      } catch (error) {
        logger.error('Error fetching subscription:', { error, component: 'useSubscription' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';

  return {
    subscription,
    hasActiveSubscription,
    isLoading,
  };
};
