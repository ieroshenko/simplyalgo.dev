import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';

type UserSubscription = Tables<'user_subscriptions'>;

export const useTrialEligibility = () => {
  const [isEligibleForTrial, setIsEligibleForTrial] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setIsEligibleForTrial(true);
      setIsLoading(false);
      return;
    }

    const checkTrialEligibility = async () => {
      try {
        const { data: subscriptions, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error checking trial eligibility:', error);
          setIsEligibleForTrial(true); // Default to eligible on error
          return;
        }

        // Check if user has had any subscription before (including cancelled ones)
        const hasHadSubscription = subscriptions && subscriptions.length > 0;
        
        // Check if user has had a trial before
        const hasHadTrial = subscriptions?.some(sub => 
          sub.status === 'trialing' || sub.status === 'cancelled'
        );

        setIsEligibleForTrial(!hasHadTrial);
      } catch (error) {
        console.error('Error checking trial eligibility:', error);
        setIsEligibleForTrial(true); // Default to eligible on error
      } finally {
        setIsLoading(false);
      }
    };

    checkTrialEligibility();
  }, [user]);

  return {
    isEligibleForTrial,
    isLoading,
  };
};
