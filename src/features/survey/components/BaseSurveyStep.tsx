import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SurveyStepProps } from '@/types/survey';

export interface BaseSurveyOption {
  label: string;
  icon?: React.ReactNode;
}

interface BaseSurveyStepProps extends SurveyStepProps {
  question?: string;
  subtitle?: string;
  options: (string | BaseSurveyOption)[];
  allowMultiple?: boolean;
  children?: React.ReactNode;
}

export const BaseSurveyStep: React.FC<BaseSurveyStepProps> = ({
  question,
  subtitle,
  options,
  allowMultiple = false,
  currentAnswer,
  onAnswer,
  onNext,
  children
}) => {
  const handleOptionClick = (optionLabel: string) => {
    if (allowMultiple) {
      const currentAnswers = currentAnswer ? currentAnswer.split(',') : [];
      const newAnswers = currentAnswers.includes(optionLabel)
        ? currentAnswers.filter(a => a !== optionLabel)
        : [...currentAnswers, optionLabel];
      onAnswer(newAnswers.join(','));
    } else {
      onAnswer(optionLabel);
      // Auto-advance for single choice
      setTimeout(() => {
        onNext();
      }, 300);
    }
  };

  const isSelected = (optionLabel: string) => {
    if (allowMultiple) {
      return currentAnswer ? currentAnswer.split(',').includes(optionLabel) : false;
    }
    return currentAnswer === optionLabel;
  };

  const getOptionLabel = (option: string | BaseSurveyOption) => 
    typeof option === 'string' ? option : option.label;

  const getOptionIcon = (option: string | BaseSurveyOption) =>
    typeof option === 'string' ? null : option.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8"
      >
        {children}
        
        {question && (
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-3 tracking-tight flex items-center justify-center gap-2">
              {question}
              {question.includes("Congratulations") && (
                <motion.span
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                >
                  🎉
                </motion.span>
              )}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground text-lg">
                {subtitle}
              </p>
            )}
          </div>
        )}
        
        <div className="space-y-3">
          {options.map((option, index) => {
            const label = getOptionLabel(option);
            const icon = getOptionIcon(option);
            const selected = isSelected(label);
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Button
                  variant={selected ? "default" : "outline"}
                  className={`w-full justify-start h-auto p-4 text-left transition-all duration-200 border-2 group ${
                    selected 
                      ? "bg-emerald-600 text-white border-emerald-600 ring-4 ring-emerald-600/10" 
                      : "hover:bg-emerald-50 hover:border-emerald-200 border-border"
                  }`}
                  onClick={() => handleOptionClick(label)}
                >
                  <span className="text-base font-medium flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      {icon && (
                        <div className={`transition-colors duration-200 ${selected ? "text-white" : "text-emerald-600"}`}>
                          {icon}
                        </div>
                      )}
                      {label}
                    </div>
                    {selected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center ml-2"
                      >
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </motion.div>
                    )}
                  </span>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
