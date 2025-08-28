import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import CompanyIcon from './CompanyIcon';

interface CompanyIconsProps {
  companies: string[];
  maxVisible?: number;
  size?: number;
  className?: string;
}

const CompanyIcons: React.FC<CompanyIconsProps> = ({ 
  companies, 
  maxVisible = 4, 
  size = 18,
  className = "" 
}) => {
  if (!companies || companies.length === 0) {
    return (
      <span className="text-xs text-muted-foreground"></span>
    );
  }

  const visibleCompanies = companies.slice(0, maxVisible);
  const hiddenCompanies = companies.slice(maxVisible);

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-1 ${className}`}>
        {/* Always visible companies */}
        {visibleCompanies.map((company, index) => (
          <CompanyIcon
            key={index}
            company={company}
            size={size}
            className="flex-shrink-0"
          />
        ))}
        
        {/* Show "+X more" with tooltip if there are hidden companies */}
        {hiddenCompanies.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center justify-center rounded-sm bg-muted text-muted-foreground hover:bg-muted/80 p-1 cursor-pointer transition-colors text-xs font-medium">
                +{hiddenCompanies.length}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="flex flex-wrap gap-2 p-2">
                {hiddenCompanies.map((company, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <CompanyIcon company={company} size={16} />
                    <span className="text-xs">{company}</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default CompanyIcons;