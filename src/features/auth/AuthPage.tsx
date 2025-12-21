import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Github } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import logoImage from "@/assets/simplyalgo-logo.png";
import { motion, AnimatePresence } from "framer-motion";

const CONCEPT_TICKER = [
  "arrays",
  "hashing",
  "two pointers",
  "sliding window",
  "linked lists",
  "binary search",
  "trees",
  "graphs",
  "dynamic programming",
];

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tickerIndex, setTickerIndex] = useState(0);
  const [systemStats, setSystemStats] = useState({
    problems: 142,
    categories: 14
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate("/dashboard");
    });

    const tickerInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % CONCEPT_TICKER.length);
    }, 3000);

    // Fetch dynamic stats from backend
    const fetchStats = async () => {
      try {
        const [pResponse, cResponse] = await Promise.all([
          supabase.from("problems").select("id", { count: "exact", head: true }),
          supabase.from("categories").select("id", { count: "exact", head: true })
        ]);

        if (pResponse.count !== null || cResponse.count !== null) {
          setSystemStats({
            problems: pResponse.count || 142,
            categories: cResponse.count || 14
          });
        }
      } catch (err) {
        logger.error('[Auth] Failed to fetch stats', { error: err });
      }
    };

    fetchStats();

    return () => {
      subscription.unsubscribe();
      clearInterval(tickerInterval);
    };
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.12,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.985 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } as unknown
    }
  };

  const authCardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } as unknown
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-[#121A16] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-[#4E7A54]/10">

      {/* Background Layer: Grain & Drift */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="fixed inset-0 pointer-events-none z-0 bg-grain"
      />

      {/* Ambient Micro-Drift Patterns */}
      <motion.div
        animate={{
          x: [0, 10, -10, 0],
          y: [0, -15, 15, 0],
        }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.02]"
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20%" cy="30%" r="1" fill="currentColor" />
          <circle cx="25%" cy="35%" r="1" fill="currentColor" />
          <path d="M 10% 80% L 15% 75% L 20% 80%" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <path d="M 85% 20% L 90% 15% L 95% 20%" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <line x1="10%" y1="10%" x2="12%" y2="12%" stroke="currentColor" strokeWidth="0.5" />
          <line x1="80%" y1="80%" x2="82%" y2="82%" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-2xl flex flex-col items-center space-y-12 z-10"
      >
        {/* Logo Section */}
        <motion.div variants={itemVariants} className="flex flex-col items-center space-y-4">
          <div className="p-3 bg-white rounded-[18px] shadow-sm border border-[#121A16]/5">
            <img src={logoImage} alt="simplyalgo" className="w-10 h-10 grayscale-[0.3]" />
          </div>
          <span className="text-xs font-bold tracking-[0.2em] uppercase opacity-30">simplyalgo</span>
        </motion.div>

        {/* Messaging Section */}
        <div className="text-center space-y-6 max-w-lg">
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-5xl font-bold tracking-tight text-[#121A16] leading-[1.05]"
          >
            Stop memorizing.<br />Start thinking.
          </motion.h1>

          <div className="space-y-4">
            <motion.p
              variants={itemVariants}
              className="text-[#121A16]/50 font-medium text-balance leading-relaxed"
            >
              Master data structures and algorithms through patterns, not rote solutions.
            </motion.p>

            {/* Concept Ticker */}
            <motion.div
              variants={itemVariants}
              className="h-6 flex items-center justify-center overflow-hidden"
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={CONCEPT_TICKER[tickerIndex]}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#4E7A54]/60"
                >
                  {tickerIndex > 0 ? "→ " : ""}{CONCEPT_TICKER[tickerIndex]}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Authentication Core */}
        <motion.div variants={authCardVariants} className="w-full max-w-md">
          <Card className="p-10 space-y-10 bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] border-[#121A16]/5 rounded-[28px]">
            <div className="text-center">
              <h2 className="text-lg font-bold tracking-tight">Sign in</h2>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest text-center border border-red-100/50">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <motion.button
                whileTap={{ y: 2 }}
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-14 bg-[#4E7A54] hover:bg-[#3D6142] text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_4px_12px_rgba(78,122,84,0.15)] group"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="translate-x-0 group-hover:translate-x-0.5 transition-transform">Continue with Google →</span>
              </motion.button>

              <motion.button
                whileTap={{ y: 2 }}
                onClick={handleGithubSignIn}
                disabled={loading}
                className="w-full h-14 border border-[#121A16]/10 bg-transparent hover:bg-[#121A16]/5 text-[#121A16] font-bold rounded-xl flex items-center justify-center gap-3 transition-colors"
              >
                <Github className="w-5 h-5 opacity-80" />
                <span>Sign in with GitHub</span>
              </motion.button>
            </div>

            <div className="text-center pt-4">
              <p className="text-[10px] text-[#121A16]/30 leading-relaxed font-medium">
                By continuing, you agree to our{" "}
                <Link to="/terms" className="text-[#4E7A54] hover:underline">Terms of Service</Link> and{" "}
                <Link to="/privacy" className="text-[#4E7A54] hover:underline">Privacy Policy</Link>
              </p>
            </div>
          </Card>
        </motion.div>

        {/* System Credibility Signals */}
        <motion.div
          variants={itemVariants}
          className="text-center space-y-8 pb-12"
        >
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[#121A16]/25">
            <span>{systemStats.problems} curated problems</span>
            <span className="opacity-40">·</span>
            <span>{systemStats.categories} categories</span>
            <span className="opacity-40">·</span>
            <span>continuously updated</span>
          </div>

          <div className="opacity-10 h-px bg-[#121A16]/50 w-24 mx-auto" />
        </motion.div>
      </motion.div>

      {/* Dynamic Online Indicator - Right Bottom */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="fixed bottom-8 right-8 z-20 flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-[#121A16]/5 shadow-sm group"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4E7A54] opacity-30"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4E7A54]"></span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#121A16]/40 group-hover:text-[#4E7A54] transition-colors">system online</span>
        </div>
      </motion.div>

      {/* Decorative End-Cap */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-6 h-1 bg-[#121A16]/10 rounded-full" />
    </div>
  );
};

export default Auth;
