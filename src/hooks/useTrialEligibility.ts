import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Tables } from "@/integrations/supabase/types";
import { logger } from "@/utils/logger";

type UserSubscription = Tables<"user_subscriptions">;

// Cache configuration - trial eligibility rarely changes
const STALE_TIME = 10 * 60 * 1000; // 10 minutes
const GC_TIME = 60 * 60 * 1000; // 60 minutes

// Check if user is eligible for trial
async function checkTrialEligibility(userId: string): Promise<boolean> {
  const { data: subscriptions, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error checking trial eligibility", error, {
      component: "useTrialEligibility",
      userId,
    });
    return true; // Default to eligible on error
  }

  // Check if user has had a trial before
  const hasHadTrial = subscriptions?.some(
    (sub) => sub.status === "trialing" || sub.status === "cancelled"
  );

  return !hasHadTrial;
}

export const useTrialEligibility = () => {
  const { user } = useAuth();

  const { data: isEligibleForTrial = true, isLoading } = useQuery({
    queryKey: ["trialEligibility", user?.id],
    queryFn: () => checkTrialEligibility(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  return {
    isEligibleForTrial,
    isLoading,
  };
};
