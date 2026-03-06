import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useTimers } from "./lib/useTimers";
import { formatRemaining, formatDurationLabel } from "./lib/formatTime";

export default function ManageTimersCommand() {
  const {
    timers,
    isLoading,
    pauseTimer,
    resumeTimer,
    deleteTimer,
    restartTimer,
    clearCompleted,
    getRemaining,
  } = useTimers();

  const activeTimers = timers.filter((t) => !t.isCompleted);
  const completedTimers = timers.filter((t) => t.isCompleted);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Timers"
      searchBarPlaceholder="Search timers..."
    >
      {activeTimers.length === 0 && completedTimers.length === 0 && (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Timers"
          description='Use "Start Timer" to create one.'
        />
      )}

      {activeTimers.length > 0 && (
        <List.Section title="Active">
          {activeTimers.map((timer) => {
            const remaining = getRemaining(timer);
            const progress = Math.round(
              ((timer.durationMs - remaining) / timer.durationMs) * 100,
            );

            return (
              <List.Item
                key={timer.id}
                title={timer.name}
                subtitle={formatRemaining(remaining)}
                icon={{
                  source: timer.isRunning ? Icon.Clock : Icon.Pause,
                  tintColor: timer.isRunning ? Color.Green : Color.Orange,
                }}
                accessories={[
                  {
                    tag: {
                      value: `${progress}%`,
                      color: timer.isRunning ? Color.Green : Color.Orange,
                    },
                  },
                  { text: formatDurationLabel(timer.durationMs) },
                ]}
                actions={
                  <ActionPanel>
                    {timer.isRunning ? (
                      <Action
                        title="Pause"
                        icon={Icon.Pause}
                        onAction={() => pauseTimer(timer.id)}
                      />
                    ) : (
                      <Action
                        title="Resume"
                        icon={Icon.Play}
                        onAction={() => resumeTimer(timer.id)}
                      />
                    )}
                    <Action
                      title="Delete"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => deleteTimer(timer.id)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {completedTimers.length > 0 && (
        <List.Section title="Completed">
          {completedTimers.map((timer) => (
            <List.Item
              key={timer.id}
              title={timer.name}
              subtitle="Done!"
              icon={{ source: Icon.CheckCircle, tintColor: Color.Blue }}
              accessories={[{ text: formatDurationLabel(timer.durationMs) }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Restart"
                    icon={Icon.ArrowCounterClockwise}
                    onAction={() => restartTimer(timer.id)}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => deleteTimer(timer.id)}
                  />
                  <Action
                    title="Clear All Completed"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    onAction={clearCompleted}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
