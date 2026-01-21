import React from 'react';
import { motion } from 'framer-motion';
import { SurveyStepProps } from '@/types/survey';
import longTermResultsImage from '@/assets/survey/simply-algo-creates-long-term-results.png';

export const LongTermResultsStep: React.FC<SurveyStepProps> = (_props) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8"
    >
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
          Simplyalgo creates long-term results
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Unlike traditional platforms, we focus on building lasting intuition rather than short-term memorization.
        </p>
      </div>
      
      <div className="flex justify-center mb-8">
        <div className="relative group w-full max-w-lg">
          {/* Decorative background element */}
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-75 transition duration-500" />
          
          {/* Main image container */}
          <div className="relative bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-900/30 p-2 rounded-[2rem] shadow-2xl overflow-hidden">
            <img 
              src={longTermResultsImage}
              alt="Simplyalgo creates long-term results chart"
              className="w-full h-auto rounded-[1.5rem] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              loading="eager"
            />
            
            {/* Subtle overlay to soften the image edges if needed */}
            <div className="absolute inset-0 rounded-[1.5rem] border border-black/5 pointer-events-none" />
          </div>

          {/* Floating badge for social proof or key takeaway */}
          <motion.div 
            initial={{ scale: 0, x: 20 }}
            animate={{ scale: 1, x: 0 }}
            transition={{ delay: 0.8, type: "spring" }}
            className="absolute -bottom-4 -right-4 bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg"
          >
            Retention +85%
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
