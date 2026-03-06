import { useCallback, useEffect, useRef, useState } from "react";
import type { Timer } from "./types";
import { getTimers, setTimers } from "./storage";

const UPDATE_INTERVAL = 1000; // 1 second for countdown display

interface UseTimersReturn {
  /** All timers (active + completed) */
  timers: Timer[];
  /** Whether the initial state is still loading */
  isLoading: boolean;
  /** Add a new timer */
  addTimer: (name: string, durationMs: number) => Promise<void>;
  /** Pause a running timer */
  pauseTimer: (id: string) => Promise<void>;
  /** Resume a paused timer */
  resumeTimer: (id: string) => Promise<void>;
  /** Delete a timer */
  deleteTimer: (id: string) => Promise<void>;
  /** Restart a completed timer with the same duration */
  restartTimer: (id: string) => Promise<void>;
  /** Delete all completed timers */
  clearCompleted: () => Promise<void>;
  /** Get the remaining time in ms for a timer */
  getRemaining: (timer: Timer) => number;
  /** Current tick timestamp -- changes every second to trigger re-renders */
  tick: number;
}

/**
 * React hook that manages a list of countdown timers with persistence.
 *
 * Timers store their startedAt timestamp and compute remaining time on the fly.
 * Completed timers are detected and marked each interval tick.
 */
export function useTimers(): UseTimersReturn {
  const [timers, setTimersState] = useState<Timer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute remaining ms for a timer
  const getRemaining = useCallback((timer: Timer): number => {
    if (timer.isCompleted) return 0;
    if (!timer.isRunning) {
      return timer.durationMs - timer.pausedElapsed;
    }
    const elapsed = timer.pausedElapsed + (Date.now() - timer.startedAt);
    return Math.max(0, timer.durationMs - elapsed);
  }, []);

  // Persist and update state
  const persist = useCallback(async (newTimers: Timer[]) => {
    setTimersState(newTimers);
    await setTimers(newTimers);
  }, []);

  // Load initial state
  useEffect(() => {
    (async () => {
      const stored = await getTimers();
      setTimersState(stored);
      setIsLoading(false);
    })();
  }, []);

  // Interval for live updates + auto-completion detection
  useEffect(() => {
    const hasActive = timers.some((t) => t.isRunning && !t.isCompleted);

    if (hasActive) {
      intervalRef.current = setInterval(() => {
        setTick(Date.now());

        // Check for newly completed timers
        setTimersState((prev) => {
          let changed = false;
          const updated = prev.map((t) => {
            if (t.isRunning && !t.isCompleted && getRemaining(t) <= 0) {
              changed = true;
              return {
                ...t,
                isRunning: false,
                isCompleted: true,
                completedAt: Date.now(),
              };
            }
            return t;
          });
          if (changed) {
            setTimers(updated); // fire-and-forget persist
          }
          return changed ? updated : prev;
        });
      }, UPDATE_INTERVAL);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timers, getRemaining]);

  const addTimer = useCallback(
    async (name: string, durationMs: number) => {
      const newTimer: Timer = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name || "Timer",
        durationMs,
        startedAt: Date.now(),
        pausedElapsed: 0,
        isRunning: true,
        isCompleted: false,
        completedAt: null,
      };
      await persist([newTimer, ...timers]);
    },
    [timers, persist],
  );

  const pauseTimer = useCallback(
    async (id: string) => {
      const now = Date.now();
      const updated = timers.map((t) => {
        if (t.id !== id || !t.isRunning) return t;
        const elapsed = t.pausedElapsed + (now - t.startedAt);
        return {
          ...t,
          isRunning: false,
          pausedElapsed: elapsed,
          startedAt: now,
        };
      });
      await persist(updated);
    },
    [timers, persist],
  );

  const resumeTimer = useCallback(
    async (id: string) => {
      const updated = timers.map((t) => {
        if (t.id !== id || t.isRunning || t.isCompleted) return t;
        return { ...t, isRunning: true, startedAt: Date.now() };
      });
      await persist(updated);
    },
    [timers, persist],
  );

  const deleteTimer = useCallback(
    async (id: string) => {
      await persist(timers.filter((t) => t.id !== id));
    },
    [timers, persist],
  );

  const restartTimer = useCallback(
    async (id: string) => {
      const updated = timers.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          startedAt: Date.now(),
          pausedElapsed: 0,
          isRunning: true,
          isCompleted: false,
          completedAt: null,
        };
      });
      await persist(updated);
    },
    [timers, persist],
  );

  const clearCompleted = useCallback(async () => {
    await persist(timers.filter((t) => !t.isCompleted));
  }, [timers, persist]);

  return {
    timers,
    isLoading,
    addTimer,
    pauseTimer,
    resumeTimer,
    deleteTimer,
    restartTimer,
    clearCompleted,
    getRemaining,
    tick,
  };
}
