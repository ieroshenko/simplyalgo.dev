import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Timer as TimerIcon, 
  Play, 
  Pause, 
  RotateCcw,
  Clock,
  WatchIcon
} from 'lucide-react';
import { useTimer, TimerMode } from '@/hooks/useTimer';

const Timer = () => {
  const {
    mode,
    time,
    isRunning,
    timerDuration,
    formatTime,
    start,
    pause,
    reset,
    switchMode,
    setTimerDuration
  } = useTimer();

  const [isOpen, setIsOpen] = useState(false);

  const handleModeSwitch = (newMode: TimerMode) => {
    switchMode(newMode);
  };

  const updateTimerDuration = (field: 'hours' | 'minutes', value: number) => {
    setTimerDuration(prev => ({
      ...prev,
      [field]: Math.max(0, Math.min(field === 'hours' ? 23 : 59, value))
    }));
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`text-muted-foreground hover:text-foreground ${
            isRunning ? 'bg-primary/10 text-primary' : ''
          }`}
        >
          {isRunning ? (
            <div className="flex items-center space-x-1">
              <span className="text-xs font-mono">
                {mode === 'stopwatch' ? '' : '⏱'}
              </span>
              <span className="text-xs font-mono min-w-[45px]">
                {formatTime(time)}
              </span>
              <RotateCcw className="w-3 h-3" />
            </div>
          ) : (
            <TimerIcon className="w-4 h-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <div className="p-4 space-y-4">
            {/* Mode Selection */}
            <div className="flex gap-2">
              <Button
                variant={mode === 'stopwatch' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeSwitch('stopwatch')}
                className="flex-1"
              >
                <WatchIcon className="w-4 h-4 mr-2" />
                Stopwatch
              </Button>
              <Button
                variant={mode === 'timer' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeSwitch('timer')}
                className="flex-1"
              >
                <Clock className="w-4 h-4 mr-2" />
                Timer
              </Button>
            </div>

            {/* Timer Duration Settings (only for timer mode) */}
            {mode === 'timer' && (
              <div className="flex items-center justify-center gap-2 p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={timerDuration.hours}
                    onChange={(e) => updateTimerDuration('hours', parseInt(e.target.value) || 0)}
                    className="w-12 text-center bg-background border border-border rounded px-1 py-1 text-sm"
                    min="0"
                    max="23"
                    disabled={isRunning}
                  />
                  <span className="text-xs text-muted-foreground">hr</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={timerDuration.minutes}
                    onChange={(e) => updateTimerDuration('minutes', parseInt(e.target.value) || 0)}
                    className="w-12 text-center bg-background border border-border rounded px-1 py-1 text-sm"
                    min="0"
                    max="59"
                    disabled={isRunning}
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
              </div>
            )}

            {/* Time Display */}
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-primary">
                {formatTime(time)}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={isRunning ? pause : start}
                disabled={mode === 'timer' && time === 0 && !isRunning}
              >
                {isRunning ? (
                  <Pause className="w-4 h-4 mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isRunning ? 'Pause' : 'Start'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="text-destructive hover:text-destructive"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>

            {/* Status */}
            {mode === 'timer' && time === 0 && !isRunning && (
              <div className="text-center text-sm text-muted-foreground">
                Set duration and click start
              </div>
            )}
          </div>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Timer;
