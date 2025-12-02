import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, TrendingUp, Target, Github } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoImage from "@/assets/simplyalgo-logo.jpg";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Auth: getSession result:", session ? "logged in" : "not logged in");
      if (session) {
        console.log("Auth: Navigating to /dashboard");
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth: onAuthStateChange event:", event, "session:", session ? "exists" : "null");
      if (event === "SIGNED_IN" && session) {
        console.log("Auth: User signed in, navigating to /dashboard");
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
      console.log("[Auth] Starting GitHub OAuth flow");
      console.log("[Auth] Redirect URL:", redirectTo);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("[Auth] GitHub Sign-In Error:", error);
      const message = error instanceof Error ? error.message : "Failed to sign in with GitHub";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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
            <a href="#" className="text-accent hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-accent hover:underline">
              Privacy Policy
            </a>
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
