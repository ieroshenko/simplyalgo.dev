import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { useAuth } from "./useAuth";
import { Tables } from "@/integrations/supabase/types";

type UserSubscription = Tables<"user_subscriptions">;

// Cache configuration - subscription status rarely changes
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 30 * 60 * 1000; // 30 minutes

// Fetch subscription from database
async function fetchSubscription(
  userId: string
): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "not found"
    logger.error("Error fetching subscription:", {
      error,
      component: "useSubscription",
    });
    throw error;
  }

  return data;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: () => fetchSubscription(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const hasActiveSubscription =
    subscription?.status === "active" || subscription?.status === "trialing";

  // Refresh subscription status (e.g., after checkout)
  const refreshSubscription = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription", user?.id] });
  };

  return {
    subscription: subscription ?? null,
    hasActiveSubscription,
    isLoading,
    refreshSubscription,
  };
};
