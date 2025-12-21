import { AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AIAccessStatus, getAccessDeniedMessage } from '@/hooks/useAIAccessStatus';

interface AIAccessDeniedBannerProps {
    status: AIAccessStatus;
    feature?: 'ai_coach' | 'ai_chat' | 'system_design';
    className?: string;
}

/**
 * Banner component to display when AI access is denied.
 * 
 * Usage:
 * ```tsx
 * const status = useAIAccessStatus();
 * 
 * if (status.isOnCooldown || !status.canUseAICoach) {
 *   return <AIAccessDeniedBanner status={status} feature="ai_coach" />;
 * }
 * ```
 */
export function AIAccessDeniedBanner({ status, feature, className }: AIAccessDeniedBannerProps) {
    const message = getAccessDeniedMessage(status);

    // Determine the specific reason
    let title = 'AI Access Unavailable';
    let icon = <AlertCircle className="h-4 w-4" />;

    if (status.isOnCooldown) {
        title = 'AI Access Paused';
        icon = <Clock className="h-4 w-4" />;
    } else if (status.dailyLimitReached) {
        title = 'Daily Limit Reached';
    } else if (status.monthlyLimitReached) {
        title = 'Monthly Limit Reached';
    } else if (feature === 'ai_coach' && !status.canUseAICoach) {
        title = 'AI Coach Disabled';
    } else if ((feature === 'ai_chat' || feature === 'system_design') && !status.canUseAIChat) {
        title = 'AI Chat Disabled';
    }

    return (
        <Alert variant="destructive" className={className}>
            {icon}
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
}

interface AIAccessGateProps {
    status: AIAccessStatus;
    feature: 'ai_coach' | 'ai_chat' | 'system_design';
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * Gate component that only renders children if AI access is allowed.
 * 
 * Usage:
 * ```tsx
 * const status = useAIAccessStatus();
 * 
 * <AIAccessGate status={status} feature="ai_coach">
 *   <AICoachButton />
 * </AIAccessGate>
 * ```
 */
export function AIAccessGate({ status, feature, children, fallback }: AIAccessGateProps) {
    const hasAccess = !status.isOnCooldown &&
        !status.dailyLimitReached &&
        !status.monthlyLimitReached &&
        (feature === 'ai_coach' ? status.canUseAICoach : status.canUseAIChat);

    if (status.loading) {
        return null; // Or a loading skeleton
    }

    if (!hasAccess) {
        return fallback ? <>{fallback}</> : <AIAccessDeniedBanner status={status} feature={feature} />;
    }

    return <>{children}</>;
}
