import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifications } from "@/shared/services/notificationService";
import { logger } from "@/utils/logger";

interface UseUserManagementOptions {
  onUpdate?: () => void;
}

interface UseUserManagementReturn {
  grantPremium: (userId: string, email: string) => Promise<void>;
  revokePremium: (userId: string, email: string) => Promise<void>;
  deleteUser: (userId: string, email: string) => Promise<void>;
  toggleAIAccess: (
    userId: string,
    email: string,
    feature: "ai_coach" | "ai_chat",
    enabled: boolean
  ) => Promise<void>;
  setCooldown: (
    userId: string,
    email: string,
    hours: number,
    reason: string
  ) => Promise<void>;
  removeCooldown: (userId: string, email: string) => Promise<void>;
  updateUserLimits: (
    userId: string,
    email: string,
    dailyLimit: number,
    monthlyLimit: number
  ) => Promise<void>;
}

export function useUserManagement(
  options: UseUserManagementOptions = {}
): UseUserManagementReturn {
  const { onUpdate } = options;

  const grantPremium = useCallback(
    async (userId: string, email: string) => {
      try {
        // First check if subscription already exists
        const { data: existingSubscription } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", userId)
          .single();

        const subscriptionData = {
          user_id: userId,
          stripe_customer_id: `admin_granted_${userId}`,
          stripe_subscription_id: `admin_granted_${Date.now()}`,
          plan: "yearly",
          status: "active",
          updated_at: new Date().toISOString(),
        };

        let error;
        if (existingSubscription) {
          const result = await supabase
            .from("user_subscriptions")
            .update(subscriptionData)
            .eq("user_id", userId);
          error = result.error;
        } else {
          const result = await supabase.from("user_subscriptions").insert({
            ...subscriptionData,
            created_at: new Date().toISOString(),
          });
          error = result.error;
        }

        if (error) {
          logger.error("[AdminDashboard] Error granting premium", {
            error,
            errorMessage: error.message,
            errorCode: error.code,
            errorDetails: error.details,
            userId,
            email,
          });
          notifications.error(`Failed to grant premium: ${error.message}`);
          return;
        }

        notifications.success(`Premium access granted to ${email}`);
        onUpdate?.();
      } catch (error) {
        logger.error("[AdminDashboard] Unexpected error granting premium", {
          error,
          userId,
          email,
        });
        notifications.error("Failed to grant premium access");
      }
    },
    [onUpdate]
  );

  const revokePremium = useCallback(
    async (userId: string, email: string) => {
      try {
        const { error } = await supabase
          .from("user_subscriptions")
          .update({ status: "cancelled" })
          .eq("user_id", userId);

        if (error) throw error;

        notifications.success(`Premium access revoked from ${email}`);
        onUpdate?.();
      } catch (error) {
        logger.error("[AdminDashboard] Error revoking premium", { error });
        notifications.error("Failed to revoke premium access");
      }
    },
    [onUpdate]
  );

  const deleteUser = useCallback(
    async (userId: string, email: string) => {
      if (
        !confirm(
          `Are you sure you want to delete user ${email}? This action cannot be undone.`
        )
      ) {
        return;
      }

      try {
        const { error } = await supabase
          .from("user_profiles")
          .delete()
          .eq("user_id", userId);

        if (error) throw error;

        notifications.success(`User ${email} deleted successfully`);
        onUpdate?.();
      } catch (error) {
        logger.error("[AdminDashboard] Error deleting user", { error });
        notifications.error("Failed to delete user");
      }
    },
    [onUpdate]
  );

  const toggleAIAccess = useCallback(
    async (
      userId: string,
      email: string,
      feature: "ai_coach" | "ai_chat",
      enabled: boolean
    ) => {
      try {
        const { data: existing } = await supabase
          .from("user_ai_restrictions")
          .select("*")
          .eq("user_id", userId)
          .single();

        const updateData =
          feature === "ai_coach"
            ? { ai_coach_enabled: enabled, updated_at: new Date().toISOString() }
            : { ai_chat_enabled: enabled, updated_at: new Date().toISOString() };

        let error;
        if (existing) {
          const result = await supabase
            .from("user_ai_restrictions")
            .update(updateData)
            .eq("user_id", userId);
          error = result.error;
        } else {
          const result = await supabase.from("user_ai_restrictions").insert({
            user_id: userId,
            ...updateData,
            ai_coach_enabled: feature === "ai_coach" ? enabled : true,
            ai_chat_enabled: feature === "ai_chat" ? enabled : true,
            daily_limit_tokens: 100000,
            monthly_limit_tokens: 2000000,
            created_at: new Date().toISOString(),
          });
          error = result.error;
        }

        if (error) {
          logger.error("[AdminDashboard] Error toggling AI access", {
            error,
            userId,
            feature,
            enabled,
          });
          notifications.error(`Failed to update AI access: ${error.message}`);
          return;
        }

        const featureName = feature === "ai_coach" ? "AI Coach" : "AI Chat";
        notifications.success(
          `${featureName} ${enabled ? "enabled" : "disabled"} for ${email}`
        );
        onUpdate?.();
      } catch (error) {
        logger.error("[AdminDashboard] Unexpected error toggling AI access", {
          error,
          userId,
          feature,
        });
        notifications.error("Failed to update AI access");
      }
    },
    [onUpdate]
  );

  const setCooldown = useCallback(
    async (userId: string, email: string, hours: number, reason: string) => {
      try {
        const cooldownUntil = new Date();
        cooldownUntil.setHours(cooldownUntil.getHours() + hours);

        const { data: existing } = await supabase
          .from("user_ai_restrictions")
          .select("*")
          .eq("user_id", userId)
          .single();

        const updateData = {
          cooldown_until: cooldownUntil.toISOString(),
          cooldown_reason: reason,
          updated_at: new Date().toISOString(),
        };

        let error;
        if (existing) {
          const result = await supabase
            .from("user_ai_restrictions")
            .update(updateData)
            .eq("user_id", userId);
          error = result.error;
        } else {
          const result = await supabase.from("user_ai_restrictions").insert({
            user_id: userId,
            ...updateData,
            ai_coach_enabled: true,
            ai_chat_enabled: true,
            daily_limit_tokens: 100000,
            monthly_limit_tokens: 2000000,
            created_at: new Date().toISOString(),
          });
          error = result.error;
        }

        if (error) {
          logger.error("[AdminDashboard] Error setting cooldown", {
            error,
            userId,
            hours,
          });
          notifications.error(`Failed to set cooldown: ${error.message}`);
          return;
        }

        notifications.success(
          `Cooldown set for ${email}: ${hours} hours - ${reason}`
        );
        onUpdate?.();
      } catch (error) {
        logger.error("[AdminDashboard] Unexpected error setting cooldown", {
          error,
          userId,
        });
        notifications.error("Failed to set cooldown");
      }
    },
    [onUpdate]
  );

  const removeCooldown = useCallback(
    async (userId: string, email: string) => {
      try {
        const { error } = await supabase
          .from("user_ai_restrictions")
          .update({
            cooldown_until: null,
            cooldown_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (error) {
          logger.error("[AdminDashboard] Error removing cooldown", {
            error,
            userId,
          });
          notifications.error(`Failed to remove cooldown: ${error.message}`);
          return;
        }

        notifications.success(`Cooldown removed for ${email}`);
        onUpdate?.();
      } catch (error) {
        logger.error("[AdminDashboard] Unexpected error removing cooldown", {
          error,
          userId,
        });
        notifications.error("Failed to remove cooldown");
      }
    },
    [onUpdate]
  );

  const updateUserLimits = useCallback(
    async (
      userId: string,
      email: string,
      dailyLimit: number,
      monthlyLimit: number
    ) => {
      try {
        const { data: existing } = await supabase
          .from("user_ai_restrictions")
          .select("*")
          .eq("user_id", userId)
          .single();

        const updateData = {
          daily_limit_tokens: dailyLimit,
          monthly_limit_tokens: monthlyLimit,
          updated_at: new Date().toISOString(),
        };

        let error;
        if (existing) {
          const result = await supabase
            .from("user_ai_restrictions")
            .update(updateData)
            .eq("user_id", userId);
          error = result.error;
        } else {
          const result = await supabase.from("user_ai_restrictions").insert({
            user_id: userId,
            ...updateData,
            ai_coach_enabled: true,
            ai_chat_enabled: true,
            created_at: new Date().toISOString(),
          });
          error = result.error;
        }

        if (error) {
          logger.error("[AdminDashboard] Error updating limits", {
            error,
            userId,
          });
          notifications.error(`Failed to update limits: ${error.message}`);
          return;
        }

        notifications.success(
          `Limits updated for ${email}: Daily ${(dailyLimit / 1000).toFixed(0)}k, Monthly ${(monthlyLimit / 1000000).toFixed(1)}M tokens`
        );
        onUpdate?.();
      } catch (error) {
        logger.error("[AdminDashboard] Unexpected error updating limits", {
          error,
          userId,
        });
        notifications.error("Failed to update limits");
      }
    },
    [onUpdate]
  );

  return {
    grantPremium,
    revokePremium,
    deleteUser,
    toggleAIAccess,
    setCooldown,
    removeCooldown,
    updateUserLimits,
  };
}
