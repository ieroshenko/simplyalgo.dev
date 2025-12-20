import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface BlurredSectionProps {
    content: string;
    label?: string;
    icon?: React.ReactNode;
    className?: string;
}

export const BlurredSection: React.FC<BlurredSectionProps> = ({
    content,
    label = "Hint",
    icon = "💡",
    className
}) => {
    const [isRevealed, setIsRevealed] = useState(false);

    return (
        <div
            className={`relative cursor-pointer text-xs text-muted-foreground p-2 rounded-md border-l-4 ${className || "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-600"}`}
            onClick={(e) => {
                e.stopPropagation();
                setIsRevealed(!isRevealed);
            }}
        >
            <div className="flex items-center gap-2">
                {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span className="text-xs font-medium">
                    {isRevealed ? `Hide ${label}` : `Click to reveal ${label}`}
                </span>
            </div>
            {isRevealed ? (
                <div className="mt-2 text-foreground whitespace-pre-wrap">
                    <span className="mr-1">{icon}</span>{content}
                </div>
            ) : (
                <div className="mt-2 select-none filter blur-sm text-muted-foreground text-xs">
                    This {label.toLowerCase()} will help guide you to the solution...
                </div>
            )}
        </div>
    );
};
