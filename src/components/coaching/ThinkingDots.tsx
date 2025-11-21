import React from 'react';

interface ThinkingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Modern smooth wave animation - default export
const ThinkingDots: React.FC<ThinkingDotsProps> = ({ 
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  };

  const gapClasses = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2'
  };

  return (
    <div className={`flex items-center ${gapClasses[size]} ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full bg-primary/70 dark:bg-primary/80`}
        style={{
          animation: 'thinking-wave 1.6s ease-in-out infinite',
          animationDelay: '0ms',
        }}
      />
      <div
        className={`${sizeClasses[size]} rounded-full bg-primary/70 dark:bg-primary/80`}
        style={{
          animation: 'thinking-wave 1.6s ease-in-out infinite',
          animationDelay: '200ms',
        }}
      />
      <div
        className={`${sizeClasses[size]} rounded-full bg-primary/70 dark:bg-primary/80`}
        style={{
          animation: 'thinking-wave 1.6s ease-in-out infinite',
          animationDelay: '400ms',
        }}
      />
    </div>
  );
};

export default ThinkingDots;
