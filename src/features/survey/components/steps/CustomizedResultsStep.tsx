import React from 'react';
import { motion } from 'framer-motion';
import { SurveyStepProps } from '@/types/survey';
import { Target, Calendar, Clover, GraduationCap, Blocks, TrendingUp, Wrench, Sparkles, CheckCircle2 } from 'lucide-react';

interface CustomizedResultsStepProps extends SurveyStepProps {
  surveyData?: { [key: number]: string };
}

export const CustomizedResultsStep: React.FC<CustomizedResultsStepProps> = (props) => {
  const { surveyData } = props;

  // Get user's answers from the survey data
  const userGoal = surveyData?.[9] || "Land a role at Big Tech";
  const userCommitment = surveyData?.[15] || "3 sessions per week";
  const userFocusAreas = surveyData?.[14] ? 
    (surveyData[14] === "Both" ? ["Assessments", "Interviews"] : surveyData[14].split(',').map(area => area.trim())) 
    : ["Interviews"];

  const recommendations = [
    {
      icon: <GraduationCap className="w-5 h-5 text-emerald-600" />,
      text: "Use coach mode on harder problems"
    },
    {
      icon: <Blocks className="w-5 h-5 text-emerald-600" />,
      text: "Get first-principle hints when stuck"
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      text: "Review feedback after each session"
    },
    {
      icon: <Wrench className="w-5 h-5 text-emerald-600" />,
      text: "Focus on writing structured, readable code"
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8"
    >
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-800 dark:text-zinc-100 mb-4 tracking-tight leading-tight">
          Congratulations, your custom plan is ready!
        </h1>
      </div>

      {/* User's Custom Plan Summary */}
      <div className="bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-900/30 rounded-[2rem] p-6 md:p-8 shadow-xl shadow-emerald-500/5 mb-10 space-y-6">
        {/* Your Goal */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-3 min-w-[140px]">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <Target className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your goal</span>
          </div>
          <div className="inline-flex bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-sm font-semibold border border-emerald-100 dark:border-emerald-800/30">
            {userGoal}
          </div>
        </div>

        {/* Commitment */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-3 min-w-[140px]">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
              {userCommitment === "Not looking for strict structure" ? (
                <Sparkles className="w-4 h-4 text-amber-500" />
              ) : (
                <Calendar className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Commitment</span>
          </div>
          <div className="inline-flex bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-sm font-semibold border border-emerald-100 dark:border-emerald-800/30">
            {userCommitment === "Not looking for strict structure" ? "Flexible schedule" : userCommitment}
          </div>
        </div>

        {/* Focus Areas */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-3 min-w-[140px]">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
              <Clover className="w-4 h-4 text-green-500" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Focus areas</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {userFocusAreas.map((area, index) => (
              <div key={index} className="bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-sm font-semibold border border-emerald-100 dark:border-emerald-800/30">
                {area}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How to reach your goal */}
      <div className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-900/30 rounded-[2rem] p-8 md:p-10 shadow-xl shadow-emerald-500/5">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Sparkles className="w-24 h-24 text-emerald-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-8 tracking-tight flex items-center gap-3">
          How to reach your goal
          <div className="h-px flex-1 bg-emerald-100 dark:bg-emerald-800/20" />
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((rec, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-800/30 flex items-center justify-center flex-shrink-0 text-emerald-600">
                {rec.icon}
              </div>
              <span className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 font-medium leading-tight pt-1">
                {rec.text}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
