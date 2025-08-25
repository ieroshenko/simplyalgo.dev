import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "AI is thinking...", 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center gap-4">
        <div className={`${sizeClasses[size]} animate-spin`}>
          <svg className="w-full h-full text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
              strokeDasharray="32"
              strokeDashoffset="32"
              className="animate-spin"
            />
            <circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
              strokeDasharray="32"
              strokeDashoffset="16"
              className="animate-spin opacity-30"
            />
          </svg>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
          {message}
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
