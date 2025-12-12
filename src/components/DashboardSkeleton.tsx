import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const DashboardSkeleton = () => {
    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar Skeleton */}
            <div className="w-64 border-r border-border bg-card p-4 space-y-4">
                <Skeleton className="h-8 w-32" />
                <div className="space-y-2">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex-1 overflow-auto">
                {/* Header Skeleton */}
                <div className="h-16 border-b border-border px-6 flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>

                {/* Content Skeleton */}
                <div className="flex flex-col xl:flex-row gap-6 p-6">
                    {/* Left Column */}
                    <div className="flex-1 space-y-6">
                        {/* Mission Strip Skeleton */}
                        <Card>
                            <CardContent className="p-4">
                                <Skeleton className="h-6 w-48 mb-2" />
                                <Skeleton className="h-4 w-full" />
                            </CardContent>
                        </Card>

                        {/* Core Battle Cards Skeleton */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <Card key={i}>
                                    <CardHeader>
                                        <Skeleton className="h-6 w-32" />
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-8 w-full" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="w-full xl:w-80 xl:flex-shrink-0 space-y-6">
                        {/* Personal Plan Card Skeleton */}
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-40" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-10 w-full mt-4" />
                            </CardContent>
                        </Card>

                        {/* Progress Radar Skeleton */}
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-32" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-48 w-full rounded-full" />
                            </CardContent>
                        </Card>

                        {/* Recent Activity Skeleton */}
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-36" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};
