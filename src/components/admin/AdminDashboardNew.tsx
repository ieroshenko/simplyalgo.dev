import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Users,
    TrendingUp,
    DollarSign,
    Activity,
    Crown,
    MessageSquare,
    Code,
    Search,
    UserMinus,
    Gift,
    CreditCard,
    ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { logger } from "@/utils/logger";

interface UserStats {
    id: string;
    email: string;
    created_at: string;
    is_premium: boolean;
    problems_solved: number;
    chat_messages: number;
    coaching_sessions: number;
    last_active: string | null;
    recent_problems: string[];
}

interface OpenRouterUsage {
    credits_remaining: number;
    credits_total: number;
    credits_used: number;
}

export function AdminDashboardNew() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [openRouterStats, setOpenRouterStats] = useState<OpenRouterUsage | null>(null);
    const [totalUsers, setTotalUsers] = useState(0);
    const [premiumUsers, setPremiumUsers] = useState(0);
    const [activeToday, setActiveToday] = useState(0);
    const [mrr, setMrr] = useState(0);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchUserStats(),
                fetchOpenRouterUsage(),
                fetchOverviewStats()
            ]);
        } catch (error) {
            logger.error("[AdminDashboard] Error fetching dashboard data", { error });
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const fetchUserStats = async () => {
        // Fetch user profiles
        const { data: profilesData, error: profilesError } = await supabase
            .from("user_profiles")
            .select("id, user_id, email, name, created_at")
            .order("created_at", { ascending: false });

        if (profilesError) throw profilesError;

        // Fetch subscriptions
        const { data: subscriptionsData } = await supabase
            .from("user_subscriptions")
            .select("user_id, status");

        // Create a map of premium users
        const premiumUserIds = new Set(
            (subscriptionsData || [])
                .filter(s => s.status === 'active' || s.status === 'trialing')
                .map(s => s.user_id)
        );

        // For each user, fetch their stats
        const userStatsPromises = (profilesData || []).map(async (profile) => {
            const userId = profile.user_id;

            // Get user_statistics for this user
            const { data: statsData } = await supabase
                .from("user_statistics")
                .select("total_solved, last_activity_date")
                .eq("user_id", userId)
                .single();

            // Get passed problems count (distinct problems only)
            const { data: passedProblems } = await supabase
                .from("user_problem_attempts")
                .select("problem_id")
                .eq("user_id", userId)
                .eq("status", "passed");

            const uniquePassedProblems = new Set(
                (passedProblems || []).map(p => p.problem_id)
            );
            const passedCount = uniquePassedProblems.size;

            // Get recent problems
            const { data: recentProblems } = await supabase
                .from("user_problem_attempts")
                .select("problem_id")
                .eq("user_id", userId)
                .order("updated_at", { ascending: false })
                .limit(5);

            // Get AI chat session count
            const { count: chatCount } = await supabase
                .from("ai_chat_sessions")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId);

            // Get coaching session count
            const { count: coachingCount } = await supabase
                .from("coaching_sessions")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId);

            const solvedCount = statsData?.total_solved || passedCount || 0;

            return {
                id: userId,
                email: profile.email || profile.name || "No email",
                created_at: profile.created_at,
                is_premium: premiumUserIds.has(userId),
                problems_solved: solvedCount,
                chat_messages: chatCount || 0,
                coaching_sessions: coachingCount || 0,
                last_active: statsData?.last_activity_date || null,
                recent_problems: (recentProblems || []).map(p => p.problem_id),
            };
        });

        const stats = await Promise.all(userStatsPromises);
        setUsers(stats);
    };

    const fetchOpenRouterUsage = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openrouter-usage`,
                {
                    headers: {
                        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch OpenRouter usage: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                logger.warn("[AdminDashboard] OpenRouter usage error", { error: data.error });
            }

            setOpenRouterStats({
                credits_remaining: data.credits_remaining || 0,
                credits_total: data.credits_total || 0,
                credits_used: data.credits_used || 0,
            });
        } catch (error) {
            logger.error("[AdminDashboard] Error fetching OpenRouter usage", { error });
            setOpenRouterStats({
                credits_remaining: 0,
                credits_total: 0,
                credits_used: 0,
            });
        }
    };

    const fetchOverviewStats = async () => {
        // Get total users from user_profiles
        const { count: totalCount } = await supabase
            .from("user_profiles")
            .select("*", { count: "exact", head: true });

        // Get premium users from subscriptions
        const { count: premiumCount } = await supabase
            .from("user_subscriptions")
            .select("*", { count: "exact", head: true })
            .in("status", ["active", "trialing"]);

        // Get active users by checking actual activity from multiple tables
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.toISOString();

        // Get users with activity today from various sources
        const [
            { data: chatUsers },
            { data: coachingUsers },
            { data: attemptsUsers },
            { data: behavioralUsers },
            { data: technicalUsers },
            { data: systemDesignUsers }
        ] = await Promise.all([
            // AI chat sessions today
            supabase
                .from("ai_chat_sessions")
                .select("user_id")
                .gte("created_at", todayStart),
            // Coaching sessions today
            supabase
                .from("coaching_sessions")
                .select("user_id")
                .gte("created_at", todayStart),
            // Problem attempts today
            supabase
                .from("user_problem_attempts")
                .select("user_id")
                .gte("created_at", todayStart),
            // Behavioral interview sessions today
            supabase
                .from("behavioral_interview_sessions")
                .select("user_id")
                .gte("created_at", todayStart),
            // Technical interview sessions today
            supabase
                .from("technical_interview_sessions")
                .select("user_id")
                .gte("created_at", todayStart),
            // System design sessions today
            supabase
                .from("system_design_sessions")
                .select("user_id")
                .gte("created_at", todayStart)
        ]);

        // Combine all user IDs and get unique count
        const allUserIds = new Set([
            ...(chatUsers?.map(u => u.user_id) || []),
            ...(coachingUsers?.map(u => u.user_id) || []),
            ...(attemptsUsers?.map(u => u.user_id) || []),
            ...(behavioralUsers?.map(u => u.user_id) || []),
            ...(technicalUsers?.map(u => u.user_id) || []),
            ...(systemDesignUsers?.map(u => u.user_id) || [])
        ]);

        const activeCount = allUserIds.size;

        setTotalUsers(totalCount || 0);
        setPremiumUsers(premiumCount || 0);
        setActiveToday(activeCount || 0);

        // Calculate MRR (Monthly Recurring Revenue) excluding admin users
        const adminEmails = ['tazigrigolia@gmail.com', 'ivaneroshenko@gmail.com'];

        // Get all active subscriptions with user email
        const { data: subscriptions } = await supabase
            .from("user_subscriptions")
            .select(`
                user_id,
                plan,
                status,
                user_profiles!inner(email)
            `)
            .in("status", ["active", "trialing"]);

        // Calculate MRR
        let totalMrr = 0;
        const monthlyPrice = 9.99; // Your monthly plan price
        const yearlyPrice = 99.99; // Your yearly plan price

        (subscriptions || []).forEach((sub: any) => {
            const userEmail = sub.user_profiles?.email;

            // Skip admin users
            if (adminEmails.includes(userEmail)) {
                return;
            }

            // Add to MRR based on plan type
            if (sub.plan === 'monthly') {
                totalMrr += monthlyPrice;
            } else if (sub.plan === 'yearly') {
                // Convert yearly to monthly
                totalMrr += yearlyPrice / 12;
            }
        });

        setMrr(totalMrr);
    };

    const grantPremium = async (userId: string, email: string) => {
        try {
            // Create a subscription record
            const { error } = await supabase
                .from("user_subscriptions")
                .upsert({
                    user_id: userId,
                    stripe_customer_id: `admin_granted_${userId}`,
                    stripe_subscription_id: `admin_granted_${Date.now()}`,
                    plan: "yearly",
                    status: "active"
                }, { onConflict: "user_id" });

            if (error) throw error;

            toast.success(`Premium access granted to ${email}`);
            fetchUserStats();
            fetchOverviewStats();
        } catch (error) {
            logger.error("[AdminDashboard] Error granting premium", { error });
            toast.error("Failed to grant premium access");
        }
    };

    const revokePremium = async (userId: string, email: string) => {
        try {
            const { error } = await supabase
                .from("user_subscriptions")
                .update({ status: "cancelled" })
                .eq("user_id", userId);

            if (error) throw error;

            toast.success(`Premium access revoked from ${email}`);
            fetchUserStats();
            fetchOverviewStats();
        } catch (error) {
            logger.error("[AdminDashboard] Error revoking premium", { error });
            toast.error("Failed to revoke premium access");
        }
    };

    const deleteUser = async (userId: string, email: string) => {
        if (!confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
            return;
        }

        try {
            // Delete from user_profiles (cascade should handle related tables)
            const { error } = await supabase
                .from("user_profiles")
                .delete()
                .eq("user_id", userId);

            if (error) throw error;

            toast.success(`User ${email} deleted successfully`);
            fetchUserStats();
            fetchOverviewStats();
        } catch (error) {
            logger.error("[AdminDashboard] Error deleting user", { error });
            toast.error("Failed to delete user");
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Never";
        return new Date(dateString).toLocaleDateString();
    };

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return "Never";
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => navigate("/dashboard")}
                        variant="outline"
                        size="icon"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                </div>
                <Button onClick={fetchDashboardData} variant="outline">
                    <Activity className="h-4 w-4 mr-2" />
                    Refresh Data
                </Button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            {premiumUsers} premium users
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">MRR</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${mrr.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            Monthly recurring revenue
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Today</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeToday}</div>
                        <p className="text-xs text-muted-foreground">
                            {totalUsers > 0 ? Math.round((activeToday / totalUsers) * 100) : 0}% of total users
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">OpenRouter Credits</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${openRouterStats?.credits_remaining.toFixed(2) || "0.00"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            ${openRouterStats?.credits_used.toFixed(2) || "0.00"} total used
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${openRouterStats?.credits_total.toFixed(2) || "0.00"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total allocation
                        </p>
                    </CardContent>
                </Card>
            </div>

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
                </TabsList>

                {/* Users Tab */}
                <TabsContent value="users" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>
                                View and manage all platform users
                            </CardDescription>
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
                                        <Card key={user.id} className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold">{user.email}</h3>
                                                        {user.is_premium && (
                                                            <Badge variant="default" className="bg-yellow-500">
                                                                <Crown className="h-3 w-3 mr-1" />
                                                                Premium
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-muted-foreground">Joined</p>
                                                            <p className="font-medium">{formatDate(user.created_at)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Last Active</p>
                                                            <p className="font-medium">{formatDate(user.last_active)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Problems Solved</p>
                                                            <p className="font-medium">
                                                                {user.problems_solved}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Activity</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex items-center">
                                                                    <MessageSquare className="h-3 w-3 mr-1" />
                                                                    <span className="font-medium">{user.chat_messages}</span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <Code className="h-3 w-3 mr-1" />
                                                                    <span className="font-medium">{user.coaching_sessions}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {user.recent_problems.length > 0 && (
                                                        <div className="text-sm">
                                                            <p className="text-muted-foreground">Recent Problems:</p>
                                                            <p className="font-mono text-xs">
                                                                {user.recent_problems.slice(0, 3).join(", ")}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-2 ml-4">
                                                    {user.is_premium ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => revokePremium(user.id, user.email)}
                                                        >
                                                            <UserMinus className="h-4 w-4 mr-1" />
                                                            Revoke Premium
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => grantPremium(user.id, user.email)}
                                                        >
                                                            <Gift className="h-4 w-4 mr-1" />
                                                            Grant Premium
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => deleteUser(user.id, user.email)}
                                                    >
                                                        <UserMinus className="h-4 w-4 mr-1" />
                                                        Delete User
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* API Usage Tab */}
                <TabsContent value="usage" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>OpenRouter API Usage</CardTitle>
                            <CardDescription>
                                Monitor your OpenRouter credits and usage
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">Credits Remaining</span>
                                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="text-3xl font-bold">
                                        ${openRouterStats?.credits_remaining.toFixed(2) || "0.00"}
                                    </div>
                                </div>

                                <div className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">Total Credits</span>
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="text-3xl font-bold">
                                        ${openRouterStats?.credits_total.toFixed(2) || "0.00"}
                                    </div>
                                </div>

                                <div className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">Credits Used</span>
                                        <Activity className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="text-3xl font-bold">
                                        ${openRouterStats?.credits_used.toFixed(2) || "0.00"}
                                    </div>
                                </div>
                            </div>

                            {openRouterStats?.credits_total === 0 && (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                        ⚠️ OpenRouter credits not available. Make sure you have set the OPENROUTER_API_KEY
                                        in your Supabase secrets.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

