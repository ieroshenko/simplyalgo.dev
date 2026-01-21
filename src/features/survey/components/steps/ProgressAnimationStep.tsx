import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { SurveyStepProps } from '@/types/survey';

export const ProgressAnimationStep: React.FC<SurveyStepProps> = (props) => {
  const { onAnswer, onNext } = props;
  const [progress, setProgress] = useState(0);

  const steps = [
    "Analyzing your answers…",
    "Understanding your interview goals…",
    "Reviewing your prep style…",
    "Identifying your strengths and areas for growth…",
    "Generating your personalized learning path…"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onAnswer("completed");
            onNext();
          }, 800);
          return 100;
        }
        // Speed up a bit but keep it smooth
        const increment = prev < 30 ? 1 : prev < 70 ? 0.8 : 1.2;
        return Math.min(prev + increment, 100);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [onAnswer, onNext]);

  const currentStepIndex = Math.min(
    Math.floor((progress / 100) * steps.length),
    steps.length - 1
  );

  return (
    <div className="flex-1 bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        {/* Progress Circular Indicator */}
        <div className="relative w-48 h-48 mx-auto mb-10">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-emerald-50 dark:text-emerald-950/20"
            />
            <motion.circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={552.92}
              initial={{ strokeDashoffset: 552.92 }}
              animate={{ strokeDashoffset: 552.92 - (552.92 * progress) / 100 }}
              transition={{ duration: 0.1, ease: "linear" }}
              className="text-emerald-600"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span 
              key={Math.round(progress)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-bold text-foreground tabular-nums tracking-tighter"
            >
              {Math.round(progress)}%
            </motion.span>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-10 tracking-tight">
          We're setting everything up for you
        </h1>
        
        <div className="space-y-4 text-left bg-emerald-50/30 dark:bg-emerald-950/10 p-6 rounded-[2rem] border border-emerald-100/50 dark:border-emerald-900/20 shadow-sm">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ 
                  opacity: index <= currentStepIndex ? 1 : 0.4,
                  x: 0,
                  scale: isCurrent ? 1.02 : 1
                }}
                className="flex items-center gap-3"
              >
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </motion.div>
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
                <span className={`text-sm font-medium transition-colors duration-300 ${
                  isCurrent ? 'text-emerald-700 dark:text-emerald-400' : 
                  isCompleted ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
