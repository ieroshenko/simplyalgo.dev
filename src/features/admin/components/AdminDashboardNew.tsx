import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Activity, Search, ArrowLeft, BarChart3, Play, RotateCcw, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { notifications } from "@/shared/services/notificationService";
import { DEMO_PROBLEM_ID } from "@/features/onboarding/demoTourSteps";
import { useOnboardingContext } from "@/features/onboarding/OnboardingContext";

// Feature imports
import { useAdminDashboard } from "../hooks/useAdminDashboard";
import { useAdminAnalytics } from "../hooks/useAdminAnalytics";
import { useUserManagement } from "../hooks/useUserManagement";
import { OverviewCards } from "./OverviewCards";
import { UserCard } from "./UserCard";
import { ApiUsageTab } from "./ApiUsageTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { SetLimitsDialog } from "./SetLimitsDialog";
import { SetCooldownDialog } from "./SetCooldownDialog";
import { AdminDashboardSkeleton } from "./AdminDashboardSkeleton";
import type { DialogUserInfo } from "../types/admin.types";

export function AdminDashboardNew() {
  const navigate = useNavigate();
  const { resetAllTours } = useOnboardingContext();

  // Dashboard data hook
  const {
    loading,
    openRouterStats,
    overviewStats,
    searchQuery,
    setSearchQuery,
    filteredUsers,
    refresh,
    refetchUserStats,
    refetchOverviewStats,
  } = useAdminDashboard();

  const { analytics, loading: analyticsLoading, refresh: refreshAnalytics } = useAdminAnalytics();

  // User management hook
  const handleUpdate = useCallback(() => {
    refetchUserStats();
    refetchOverviewStats();
  }, [refetchUserStats, refetchOverviewStats]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), refreshAnalytics()]);
  }, [refresh, refreshAnalytics]);

  const {
    grantPremium,
    revokePremium,
    deleteUser,
    toggleAIAccess,
    setCooldown,
    removeCooldown,
    updateUserLimits,
  } = useUserManagement({ onUpdate: handleUpdate });

  // Dialog state
  const [limitsDialogOpen, setLimitsDialogOpen] = useState(false);
  const [limitsDialogUser, setLimitsDialogUser] = useState<DialogUserInfo | null>(null);
  const [dailyLimitInput, setDailyLimitInput] = useState("100000");
  const [monthlyLimitInput, setMonthlyLimitInput] = useState("2000000");

  const [cooldownDialogOpen, setCooldownDialogOpen] = useState(false);
  const [cooldownDialogUser, setCooldownDialogUser] = useState<DialogUserInfo | null>(null);
  const [cooldownHoursInput, setCooldownHoursInput] = useState("24");
  const [cooldownReasonInput, setCooldownReasonInput] = useState("Admin action");

  // Dialog handlers
  const handleOpenLimitsDialog = useCallback(
    (user: DialogUserInfo, dailyLimit: number, monthlyLimit: number) => {
      setLimitsDialogUser(user);
      setDailyLimitInput(String(dailyLimit));
      setMonthlyLimitInput(String(monthlyLimit));
      setLimitsDialogOpen(true);
    },
    []
  );

  const handleOpenCooldownDialog = useCallback((user: DialogUserInfo) => {
    setCooldownDialogUser(user);
    setCooldownHoursInput("1");
    setCooldownReasonInput("Admin action");
    setCooldownDialogOpen(true);
  }, []);

  const handleSubmitLimits = useCallback(() => {
    if (limitsDialogUser) {
      updateUserLimits(
        limitsDialogUser.id,
        limitsDialogUser.email,
        parseInt(dailyLimitInput) || 100000,
        parseInt(monthlyLimitInput) || 2000000
      );
      setLimitsDialogOpen(false);
    }
  }, [limitsDialogUser, dailyLimitInput, monthlyLimitInput, updateUserLimits]);

  const handleSubmitCooldown = useCallback(() => {
    if (cooldownDialogUser) {
      setCooldown(
        cooldownDialogUser.id,
        cooldownDialogUser.email,
        parseInt(cooldownHoursInput) || 24,
        cooldownReasonInput
      );
      setCooldownDialogOpen(false);
    }
  }, [cooldownDialogUser, cooldownHoursInput, cooldownReasonInput, setCooldown]);

  // Reset survey handler for testing onboarding flow
  const handleResetSurvey = useCallback(async (userId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('survey_responses')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      notifications.success(`Survey reset for ${email}`);
      handleUpdate();
    } catch (error) {
      notifications.error('Failed to reset survey');
    }
  }, [handleUpdate]);

  // Open demo mode for testing
  const handleTestDemoMode = useCallback(() => {
    // Clear demo state so tour starts fresh
    localStorage.removeItem('simplyalgo_demo_state');
    window.open(`/problems/${DEMO_PROBLEM_ID}?demo=true`, '_blank');
  }, []);

  // Replay onboarding tour for testing
  const handleReplayOnboardingTour = useCallback(() => {
    resetAllTours();
    notifications.success('Onboarding tours reset! Redirecting to dashboard...');
    navigate('/dashboard');
  }, [resetAllTours, navigate]);

  // Open survey flow for testing
  const handleTestSurveyFlow = useCallback(() => {
    window.open('/survey/1?admin=true', '_blank');
  }, []);

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Navigation */}
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        <span>Back</span>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleReplayOnboardingTour} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Replay Onboarding Tour
          </Button>
          <Button onClick={handleTestSurveyFlow} variant="outline">
            <ClipboardList className="h-4 w-4 mr-2" />
            Test Survey Flow
          </Button>
          <Button onClick={handleTestDemoMode} variant="outline">
            <Play className="h-4 w-4 mr-2" />
            Test Demo Mode
          </Button>
          <Button onClick={handleRefresh} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <OverviewCards stats={overviewStats} openRouterStats={openRouterStats} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="usage">
            <Activity className="h-4 w-4 mr-2" />
            API Usage
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage all platform users</CardDescription>
              <div className="flex items-center gap-2 mt-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No users found
                  </p>
                ) : (
                  filteredUsers.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onGrantPremium={grantPremium}
                      onRevokePremium={revokePremium}
                      onDeleteUser={deleteUser}
                      onToggleAIAccess={toggleAIAccess}
                      onRemoveCooldown={removeCooldown}
                      onOpenCooldownDialog={handleOpenCooldownDialog}
                      onOpenLimitsDialog={handleOpenLimitsDialog}
                      onResetSurvey={handleResetSurvey}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <ApiUsageTab openRouterStats={openRouterStats} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsTab stats={analytics} loading={analyticsLoading} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SetLimitsDialog
        open={limitsDialogOpen}
        onOpenChange={setLimitsDialogOpen}
        user={limitsDialogUser}
        dailyLimit={dailyLimitInput}
        monthlyLimit={monthlyLimitInput}
        onDailyLimitChange={setDailyLimitInput}
        onMonthlyLimitChange={setMonthlyLimitInput}
        onSubmit={handleSubmitLimits}
      />

      <SetCooldownDialog
        open={cooldownDialogOpen}
        onOpenChange={setCooldownDialogOpen}
        user={cooldownDialogUser}
        hours={cooldownHoursInput}
        reason={cooldownReasonInput}
        onHoursChange={setCooldownHoursInput}
        onReasonChange={setCooldownReasonInput}
        onSubmit={handleSubmitCooldown}
      />
    </div>
  );
}
