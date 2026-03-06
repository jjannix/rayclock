import { showHUD } from "@raycast/api";
import { getStopwatch, setStopwatch } from "./lib/storage";
import { formatElapsed } from "./lib/formatTime";

export default async function StartStopwatchCommand() {
  const state = await getStopwatch();

  if (state.isRunning) {
    // Pause
    const now = Date.now();
    const currentElapsed =
      state.startedAt !== null
        ? state.pausedElapsed + (now - state.startedAt)
        : state.pausedElapsed;

    await setStopwatch({
      ...state,
      isRunning: false,
      startedAt: null,
      pausedElapsed: currentElapsed,
    });

    await showHUD(`Stopwatch Paused at ${formatElapsed(currentElapsed)}`);
  } else {
    // Start / Resume
    await setStopwatch({
      ...state,
      isRunning: true,
      startedAt: Date.now(),
    });

    const wasStarted = state.pausedElapsed > 0;
    await showHUD(wasStarted ? "Stopwatch Resumed" : "Stopwatch Started");
  }
}
