import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { SurveyStepProps } from '@/types/survey';
import timeToGeneratePlanImage from '@/assets/survey/time-to-generate-custom-plan.png';

export const PlanGenerationIntroStep: React.FC<SurveyStepProps> = (props) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8"
    >
      <div className="flex justify-center mb-10">
        <div className="relative group w-full max-w-sm">
          {/* Decorative background element */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/10 via-emerald-600/5 to-emerald-400/10 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition duration-700" />
          
          {/* Main image container */}
          <div className="relative bg-white dark:bg-zinc-900 border border-emerald-50/50 dark:border-emerald-900/20 p-4 rounded-[2.5rem] shadow-xl overflow-hidden">
            <img 
              src={timeToGeneratePlanImage}
              alt="Time to generate your custom plan"
              className="w-full h-auto rounded-[2rem] object-cover transition-all duration-700 group-hover:scale-105 group-hover:rotate-1"
              loading="eager"
            />
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-6 tracking-tight">
          Time to generate your custom plan!
        </h1>
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full font-semibold border border-emerald-100 dark:border-emerald-800/30 shadow-sm"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          All done!
        </motion.div>
      </div>
    </motion.div>
  );
};
