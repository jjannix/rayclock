import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useStopwatch } from "./lib/useStopwatch";
import { formatElapsed } from "./lib/formatTime";

export default function StopwatchCommand() {
  const { elapsed, isRunning, laps, isLoading, start, pause, reset, lap } =
    useStopwatch();

  const timeDisplay = formatElapsed(elapsed);
  const hasStarted = elapsed > 0 || isRunning;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Stopwatch"
      searchBarPlaceholder="Stopwatch"
    >
      {/* Main stopwatch display */}
      <List.Section title="Stopwatch">
        <List.Item
          title={timeDisplay}
          subtitle={isRunning ? "Running" : hasStarted ? "Paused" : "Ready"}
          icon={{
            source: isRunning
              ? Icon.Clock
              : hasStarted
                ? Icon.Pause
                : Icon.Stopwatch,
            tintColor: isRunning
              ? Color.Green
              : hasStarted
                ? Color.Orange
                : Color.SecondaryText,
          }}
          accessories={
            isRunning
              ? [{ tag: { value: "Running", color: Color.Green } }]
              : hasStarted
                ? [{ tag: { value: "Paused", color: Color.Orange } }]
                : []
          }
          actions={
            <ActionPanel>
              {!isRunning ? (
                <Action
                  title={hasStarted ? "Resume" : "Start"}
                  icon={Icon.Play}
                  onAction={start}
                />
              ) : (
                <Action title="Pause" icon={Icon.Pause} onAction={pause} />
              )}
              {isRunning && (
                <Action
                  title="Lap"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  onAction={lap}
                />
              )}
              {hasStarted && (
                <Action
                  title="Reset"
                  icon={Icon.ArrowCounterClockwise}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={reset}
                />
              )}
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Laps */}
      {laps.length > 0 && (
        <List.Section title="Laps">
          {[...laps].reverse().map((l) => (
            <List.Item
              key={l.number}
              title={`Lap ${l.number}`}
              icon={Icon.Hashtag}
              accessories={[
                { text: `Split: ${formatElapsed(l.splitMs)}` },
                { text: `Total: ${formatElapsed(l.cumulativeMs)}` },
              ]}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
