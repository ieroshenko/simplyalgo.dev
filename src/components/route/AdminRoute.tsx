import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/utils/logger";

interface AdminRouteProps {
  children: React.ReactNode;
}

// Whitelist of admin emails
const ADMIN_EMAILS = [
  "tazigrigolia@gmail.com",
  "ivaneroshenko@gmail.com"
];

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const userEmailLower = user.email?.toLowerCase();
  if (!userEmailLower || !ADMIN_EMAILS.some(email => email.toLowerCase() === userEmailLower)) {
    logger.warn('[AdminRoute] Unauthorized access attempt', { email: user.email, path: '/admin' });
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
