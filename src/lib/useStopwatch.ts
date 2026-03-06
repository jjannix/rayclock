import { useCallback, useEffect, useRef, useState } from "react";
import type { StopwatchState, Lap } from "./types";
import { getStopwatch, setStopwatch } from "./storage";

const UPDATE_INTERVAL = 100; // ms

interface UseStopwatchReturn {
  /** Current elapsed time in ms (live-updating while running) */
  elapsed: number;
  /** Whether the stopwatch is currently running */
  isRunning: boolean;
  /** Recorded laps */
  laps: Lap[];
  /** Whether the initial state is still loading from storage */
  isLoading: boolean;
  /** Start or resume the stopwatch */
  start: () => Promise<void>;
  /** Pause the stopwatch */
  pause: () => Promise<void>;
  /** Reset the stopwatch to zero */
  reset: () => Promise<void>;
  /** Record a lap */
  lap: () => Promise<void>;
}

/**
 * React hook that manages stopwatch state with persistence via LocalStorage.
 *
 * Stores timestamps rather than durations so elapsed time is accurate across
 * command invocations. Uses setInterval for live UI updates.
 */
export function useStopwatch(): UseStopwatchReturn {
  const [state, setState] = useState<StopwatchState>({
    isRunning: false,
    startedAt: null,
    pausedElapsed: 0,
    laps: [],
  });
  const [elapsed, setElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute the current elapsed time from state
  const computeElapsed = useCallback((s: StopwatchState): number => {
    if (s.isRunning && s.startedAt !== null) {
      return s.pausedElapsed + (Date.now() - s.startedAt);
    }
    return s.pausedElapsed;
  }, []);

  // Persist state to storage
  const persist = useCallback(async (s: StopwatchState) => {
    await setStopwatch(s);
  }, []);

  // Load initial state
  useEffect(() => {
    (async () => {
      const stored = await getStopwatch();
      setState(stored);
      setElapsed(computeElapsed(stored));
      setIsLoading(false);
    })();
  }, [computeElapsed]);

  // Set up interval for live updates
  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(computeElapsed(state));
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
  }, [
    state.isRunning,
    state.startedAt,
    state.pausedElapsed,
    computeElapsed,
    state,
  ]);

  const start = useCallback(async () => {
    const newState: StopwatchState = {
      ...state,
      isRunning: true,
      startedAt: Date.now(),
    };
    setState(newState);
    setElapsed(computeElapsed(newState));
    await persist(newState);
  }, [state, computeElapsed, persist]);

  const pause = useCallback(async () => {
    const now = Date.now();
    const currentElapsed =
      state.startedAt !== null
        ? state.pausedElapsed + (now - state.startedAt)
        : state.pausedElapsed;
    const newState: StopwatchState = {
      ...state,
      isRunning: false,
      startedAt: null,
      pausedElapsed: currentElapsed,
    };
    setState(newState);
    setElapsed(currentElapsed);
    await persist(newState);
  }, [state, persist]);

  const reset = useCallback(async () => {
    const newState: StopwatchState = {
      isRunning: false,
      startedAt: null,
      pausedElapsed: 0,
      laps: [],
    };
    setState(newState);
    setElapsed(0);
    await persist(newState);
  }, [persist]);

  const recordLap = useCallback(async () => {
    const currentElapsed = computeElapsed(state);
    const lastCumulative =
      state.laps.length > 0
        ? state.laps[state.laps.length - 1].cumulativeMs
        : 0;
    const newLap: Lap = {
      number: state.laps.length + 1,
      splitMs: currentElapsed - lastCumulative,
      cumulativeMs: currentElapsed,
    };
    const newState: StopwatchState = {
      ...state,
      laps: [...state.laps, newLap],
    };
    setState(newState);
    await persist(newState);
  }, [state, computeElapsed, persist]);

  return {
    elapsed,
    isRunning: state.isRunning,
    laps: state.laps,
    isLoading,
    start,
    pause,
    reset,
    lap: recordLap,
  };
}
