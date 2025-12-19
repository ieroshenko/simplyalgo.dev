import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, TrendingUp, Target, Github } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import logoImage from "@/assets/simplyalgo-logo.png";
import { motion } from "framer-motion";
import { isFeatureEnabled } from "@/config/features";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const useOSTheme = isFeatureEnabled('OS_THEME');

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      logger.debug('[Auth] getSession result', { hasSession: !!session });
      if (session) {
        logger.debug('[Auth] Navigating to /dashboard');
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logger.debug('[Auth] onAuthStateChange event', { event, hasSession: !!session });
      if (event === "SIGNED_IN" && session) {
        logger.debug('[Auth] User signed in, navigating to /dashboard');
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sign in with Google";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      setLoading(true);
      setError("");

      const redirectTo = `${window.location.origin}/dashboard`;
      logger.debug('[Auth] Starting GitHub OAuth flow', { redirectTo });

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo,
        },
      });

      if (error) throw error;
    } catch (error) {
      logger.error('[Auth] GitHub Sign-In Error', { error });
      const message = error instanceof Error ? error.message : "Failed to sign in with GitHub";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (useOSTheme) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#050505] text-foreground flex flex-col items-center justify-center p-4 bg-grain relative overflow-hidden font-sans">
        {/* Background Pattern - Algorithmic Graph */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-algo-pattern" />

        {/* SVG lines for the technical graph feel */}
        <svg className="absolute inset-0 w-full h-full z-0 opacity-[0.05] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <line x1="10%" y1="20%" x2="30%" y2="40%" stroke="currentColor" strokeWidth="1" />
          <line x1="30%" y1="40%" x2="20%" y2="70%" stroke="currentColor" strokeWidth="1" />
          <line x1="30%" y1="40%" x2="60%" y2="30%" stroke="currentColor" strokeWidth="1" />
          <line x1="60%" y1="30%" x2="80%" y2="50%" stroke="currentColor" strokeWidth="1" />
          <line x1="80%" y1="50%" x2="70%" y2="80%" stroke="currentColor" strokeWidth="1" />
          <circle cx="10%" cy="20%" r="2" fill="currentColor" />
          <circle cx="30%" cy="40%" r="2" fill="currentColor" />
          <circle cx="20%" cy="70%" r="2" fill="currentColor" />
          <circle cx="60%" cy="30%" r="2" fill="currentColor" />
          <circle cx="80%" cy="50%" r="2" fill="currentColor" />
          <circle cx="70%" cy="80%" r="2" fill="currentColor" />
        </svg>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-xl space-y-12 z-10 flex flex-col items-center"
        >
          {/* Logo and Header */}
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-2.5 border border-border/40 bg-background rounded-2xl shadow-sm overflow-hidden">
                <img
                  src={logoImage}
                  alt="simplyalgo"
                  className="w-10 h-10 grayscale brightness-110 rounded-lg"
                />
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-xl font-medium tracking-[0.2em] text-foreground/40 lowercase">
                simplyalgo
              </h1>
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-foreground max-w-lg mx-auto leading-[1.1]">
                Stop memorizing.<br />Start thinking.
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground/60 font-medium tracking-tight">
                Master data structures and algorithms the way real engineers do.
              </p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="w-full max-w-md p-8 pt-10 space-y-10 bg-white/40 dark:bg-black/40 backdrop-blur-md border-border/40 rounded-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ef4444]/20 to-transparent" />

            <div className="text-center">
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/50">
                Authentication
              </h3>
            </div>

            {error && (
              <div className="text-destructive text-sm text-center font-mono uppercase tracking-widest">{error}</div>
            )}

            <div className="space-y-4">
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium py-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 group"
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="tracking-tight">{loading ? "Authenticating..." : "Continue with Google"}</span>
              </Button>

              <Button
                onClick={handleGithubSignIn}
                disabled={loading}
                variant="outline"
                className="w-full border-border bg-transparent hover:bg-muted text-foreground font-medium py-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3"
              >
                <Github className="w-5 h-5" />
                <span className="tracking-tight">{loading ? "Authenticating..." : "Continue with GitHub"}</span>
              </Button>
            </div>

            <div className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 leading-relaxed">
              By continuing, you agree to our{" "}
              <Link to="/terms" className="text-[#ef4444] font-semibold hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-[#ef4444] font-semibold hover:underline">
                Privacy Policy
              </Link>
            </div>
          </Card>

          {/* Footer info - text only, evenly spaced */}
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground/50 pt-8 border-t border-border/20 w-full max-w-2xl px-4">
            <span className="flex items-center gap-2">
              <span className="text-[10px]">λ</span> AI-guided problem solving
            </span>
            <span className="hidden md:block text-border/40">|</span>
            <span className="flex items-center gap-2">
              <span className="text-[10px]">→</span> Pattern-based mastery
            </span>
            <span className="hidden md:block text-border/40">|</span>
            <span className="flex items-center gap-2">
              <span className="text-[10px]">×</span> Blind 75, deeply explained
            </span>
          </div>

          {/* Simple red glyph separator as seen in mockup */}
          <div className="pt-8 opacity-20 flex items-center gap-4 w-full justify-center">
            <div className="h-[1px] bg-foreground/20 flex-1 max-w-[100px]" />
            <span className="text-[#ef4444] text-xs">×</span>
            <div className="h-[1px] bg-foreground/20 flex-1 max-w-[100px]" />
          </div>
        </motion.div>
      </div>
    );
  }

  // Legacy Theme
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img
              src={logoImage}
              alt="simplyalgo"
              className="w-16 h-16 rounded-lg"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">simplyalgo</h1>
            <p className="text-muted-foreground mt-2">
              Learn DSA with AI guidance
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">
              Welcome Back
            </h2>
          </div>

          {error && (
            <div className="text-destructive text-sm text-center">{error}</div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3"
              size="lg"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? "Signing in..." : "Continue with Google"}
            </Button>

            <Button
              onClick={handleGithubSignIn}
              disabled={loading}
              variant="outline"
              className="w-full font-medium py-3"
              size="lg"
            >
              <Github className="w-5 h-5 mr-3" />
              {loading ? "Signing in..." : "Continue with GitHub"}
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link to="/terms" className="text-primary font-medium hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary font-medium hover:underline">
              Privacy Policy
            </Link>
          </div>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mx-auto">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div className="text-sm font-medium text-foreground">
              AI Tutoring
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mx-auto">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div className="text-sm font-medium text-foreground">
              Progress Tracking
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mx-auto">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div className="text-sm font-medium text-foreground">Blind 75</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
