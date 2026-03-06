import {
  ActionPanel,
  Action,
  Form,
  List,
  Icon,
  useNavigation,
  showHUD,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { useTimers } from "./lib/useTimers";
import { getRecentDurations, addRecentDuration } from "./lib/storage";
import { formatDurationLabel } from "./lib/formatTime";
import type { RecentDuration } from "./lib/types";

function TimerForm({
  onSubmit,
}: {
  onSubmit: (name: string, durationMs: number) => Promise<void>;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="New Timer"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Timer"
            icon={Icon.Play}
            onSubmit={async (values: {
              name: string;
              hours: string;
              minutes: string;
              seconds: string;
            }) => {
              const h = parseInt(values.hours || "0", 10) || 0;
              const m = parseInt(values.minutes || "0", 10) || 0;
              const s = parseInt(values.seconds || "0", 10) || 0;
              const totalMs = (h * 3600 + m * 60 + s) * 1000;

              if (totalMs <= 0) {
                return;
              }

              await onSubmit(values.name, totalMs);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g. Tea, Workout, Focus..."
      />
      <Form.Separator />
      <Form.TextField
        id="hours"
        title="Hours"
        placeholder="0"
        defaultValue=""
      />
      <Form.TextField
        id="minutes"
        title="Minutes"
        placeholder="0"
        defaultValue=""
      />
      <Form.TextField
        id="seconds"
        title="Seconds"
        placeholder="0"
        defaultValue=""
      />
    </Form>
  );
}

export default function StartTimerCommand() {
  const { addTimer } = useTimers();
  const [recents, setRecents] = useState<RecentDuration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    (async () => {
      const stored = await getRecentDurations();
      setRecents(stored);
      setIsLoading(false);
    })();
  }, []);

  const handleStartTimer = async (name: string, durationMs: number) => {
    await addTimer(name, durationMs);
    await addRecentDuration({
      durationMs,
      label: formatDurationLabel(durationMs),
      lastUsedAt: Date.now(),
    });
    // Refresh recents
    const updated = await getRecentDurations();
    setRecents(updated);
    await showHUD(
      `Timer "${name || "Timer"}" started for ${formatDurationLabel(durationMs)}`,
    );
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Start Timer"
      searchBarPlaceholder="Start a timer..."
    >
      {/* Custom timer action */}
      <List.Section title="New Timer">
        <List.Item
          title="Custom Timer"
          subtitle="Set a custom duration"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="Create Timer"
                icon={Icon.Plus}
                onAction={() => push(<TimerForm onSubmit={handleStartTimer} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Recent durations */}
      {recents.length > 0 && (
        <List.Section title="Recent Durations">
          {recents.map((recent) => (
            <List.Item
              key={recent.durationMs}
              title={recent.label}
              icon={Icon.Clock}
              subtitle="Start again"
              actions={
                <ActionPanel>
                  <Action
                    title={`Start ${recent.label} Timer`}
                    icon={Icon.Play}
                    onAction={() => handleStartTimer("", recent.durationMs)}
                  />
                  <Action
                    title="Start with Name"
                    icon={Icon.Pencil}
                    onAction={() =>
                      push(
                        <TimerForm
                          onSubmit={async (name, _) => {
                            await handleStartTimer(name, recent.durationMs);
                          }}
                        />,
                      )
                    }
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
