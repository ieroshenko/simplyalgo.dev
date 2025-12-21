import React from 'react';
import { ChevronDown, MapPin, Minimize2, Move } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PositionPreset } from './types';

interface OverlayHeaderProps {
    positionPreset: PositionPreset;
    onApplyPreset: (preset: PositionPreset | 'custom') => void;
    isMinimized: boolean;
    onToggleMinimize: () => void;
}

export const OverlayHeader: React.FC<OverlayHeaderProps> = ({
    positionPreset,
    onApplyPreset,
    isMinimized,
    onToggleMinimize,
}) => {
    return (
        <div
            className="drag-handle p-3 border-b border-border bg-muted/50 rounded-t-xl flex justify-between items-center select-none"
        >
            <div className="flex items-center gap-2 pointer-events-none">
                <div className="flex items-center gap-1">
                    <ChevronDown className="w-3 h-3 text-primary" />
                    <div className="text-xs font-medium text-primary">
                        AI Coach
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        {/* Prevent drag start when clicking the button */}
                        <button
                            className="p-1 hover:bg-accent hover:text-accent-foreground rounded transition-colors no-drag cursor-pointer"
                            title="Overlay position"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <MapPin className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 z-[2001]">
                        <DropdownMenuLabel>Overlay Position</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup value={positionPreset} onValueChange={(v) => onApplyPreset(v as any)}>
                            <DropdownMenuRadioItem value="auto">Auto (smart)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="center">Center</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="center-bottom">Center bottom</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="left-top">Top left</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="right-top">Top right</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="right-bottom">Bottom right</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="left-bottom">Bottom left</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { onApplyPreset('custom'); }}>Use dragged position</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <button
                    onClick={onToggleMinimize}
                    className="p-1 hover:bg-accent hover:text-accent-foreground rounded transition-colors no-drag cursor-pointer"
                    title={isMinimized ? "Expand" : "Minimize"}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <Minimize2 className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                </button>

                <div
                    title="Drag to move"
                    className="p-1 hover:bg-accent hover:text-accent-foreground rounded cursor-move drag-handle"
                >
                    <Move className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                </div>
            </div>
        </div>
    );
};
