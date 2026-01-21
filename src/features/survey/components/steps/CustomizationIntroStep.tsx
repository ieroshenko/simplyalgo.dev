import React from 'react';
import { motion } from 'framer-motion';
import { SurveyStepProps } from '@/types/survey';
import letsMakeSimplyalgoFitImage from '@/assets/survey/lets-make-simplyalgo-fit.png';

export const CustomizationIntroStep: React.FC<SurveyStepProps> = (props) => {
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
              src={letsMakeSimplyalgoFitImage}
              alt="Let's make SimplyAlgo fit you"
              className="w-full h-auto rounded-[2rem] object-cover transition-all duration-700 group-hover:scale-105 group-hover:rotate-1"
              loading="eager"
            />
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4 tracking-tight">
          Let's make SimplyAlgo fit you
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
          Answer a few quick questions so we can tailor the experience to your goals.
        </p>
      </div>
    </motion.div>
  );
};
