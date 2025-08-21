import { useState, useEffect, useRef, useCallback } from "react";

export type TimerMode = "stopwatch" | "timer";

export const useTimer = () => {
  const [mode, setMode] = useState<TimerMode>("stopwatch");
  const [time, setTime] = useState(0); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState({ hours: 0, minutes: 25 }); // Default 25 min
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const start = useCallback(() => {
    if (mode === "timer" && time === 0) {
      setTime(timerDuration.hours * 3600 + timerDuration.minutes * 60);
    }
    setIsRunning(true);
  }, [mode, time, timerDuration]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTime(
      mode === "timer"
        ? timerDuration.hours * 3600 + timerDuration.minutes * 60
        : 0,
    );
  }, [mode, timerDuration]);

  const switchMode = useCallback(
    (newMode: TimerMode) => {
      setMode(newMode);
      setIsRunning(false);
      setTime(
        newMode === "timer"
          ? timerDuration.hours * 3600 + timerDuration.minutes * 60
          : 0,
      );
    },
    [timerDuration],
  );

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime((prevTime) => {
          const newTime =
            mode === "stopwatch"
              ? prevTime + 1
              : prevTime <= 1
                ? 0
                : prevTime - 1;

          // Update tab title with timer
          const timeStr = formatTime(newTime);
          const modeIcon = mode === "stopwatch" ? "▶" : "⏱";
          document.title = `${modeIcon} ${timeStr} - LeetCode Arena`;

          if (mode === "timer" && newTime <= 0) {
            setIsRunning(false);
            // Reset title when timer ends
            document.title = "LeetCode Arena";
          }

          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reset title when stopped
      document.title = "LeetCode Arena";
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Reset title on cleanup
      document.title = "LeetCode Arena";
    };
  }, [isRunning, mode, formatTime]);

  return {
    mode,
    time,
    isRunning,
    timerDuration,
    formatTime,
    start,
    pause,
    reset,
    switchMode,
    setTimerDuration,
  };
};
