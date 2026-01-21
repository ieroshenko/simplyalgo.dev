import React from 'react';
import { motion } from 'framer-motion';
import { PartyPopper, Sparkles } from 'lucide-react';
import { SurveyStepProps } from '@/types/survey';

export const CongratulationsStep: React.FC<SurveyStepProps> = (props) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 py-12"
    >
      <div className="relative mb-8">
        <motion.div
          initial={{ rotate: -20, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2
          }}
          className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center"
        >
          <PartyPopper className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
        </motion.div>
        
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-2 -right-2 text-emerald-500"
        >
          <Sparkles className="w-6 h-6" />
        </motion.div>
      </div>

      <div className="text-center space-y-4">
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight"
        >
          Congratulations!
        </motion.h1>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-xl md:text-2xl text-emerald-600 dark:text-emerald-400 font-semibold">
            Your custom plan is ready
          </span>
          <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
            We've analyzed your goals and prepared a personalized roadmap just for you.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};
