import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { getWorldClockZones, setWorldClockZones } from "./lib/storage";
import {
  formatClockTime,
  formatClockDate,
  getUtcOffset,
  getTimeDifference,
} from "./lib/formatTime";
import { ALL_TIMEZONES } from "./lib/timezones";
import type { WorldClockZone } from "./lib/types";

const UPDATE_INTERVAL = 1000;

function AddTimezoneView({
  existingZones,
  onAdd,
}: {
  existingZones: WorldClockZone[];
  onAdd: (zone: WorldClockZone) => void;
}) {
  const { pop } = useNavigation();
  const existingSet = new Set(
    existingZones.map((z) => `${z.label}-${z.timezone}`),
  );

  const available = ALL_TIMEZONES.filter(
    (z) => !existingSet.has(`${z.label}-${z.timezone}`),
  );

  return (
    <List
      navigationTitle="Add Timezone"
      searchBarPlaceholder="Search cities..."
    >
      {available.map((zone) => {
        const now = new Date();
        return (
          <List.Item
            key={`${zone.label}-${zone.timezone}`}
            title={zone.label}
            subtitle={zone.timezone}
            accessories={[
              { text: formatClockTime(now, zone.timezone) },
              { text: getUtcOffset(now, zone.timezone) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Add Timezone"
                  icon={Icon.Plus}
                  onAction={() => {
                    onAdd(zone);
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function WorldClockCommand() {
  const [zones, setZones] = useState<WorldClockZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { push } = useNavigation();

  // Load zones
  useEffect(() => {
    (async () => {
      const stored = await getWorldClockZones();
      setZones(stored);
      setIsLoading(false);
    })();
  }, []);

  // Live-update the clock every second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setNow(new Date());
    }, UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const persistZones = useCallback(async (newZones: WorldClockZone[]) => {
    setZones(newZones);
    await setWorldClockZones(newZones);
  }, []);

  const handleAdd = useCallback(
    async (zone: WorldClockZone) => {
      const updated = [...zones, zone];
      await persistZones(updated);
    },
    [zones, persistZones],
  );

  const handleRemove = useCallback(
    async (index: number) => {
      const updated = zones.filter((_, i) => i !== index);
      await persistZones(updated);
    },
    [zones, persistZones],
  );

  const handleMoveUp = useCallback(
    async (index: number) => {
      if (index <= 0) return;
      const updated = [...zones];
      [updated[index - 1], updated[index]] = [
        updated[index],
        updated[index - 1],
      ];
      await persistZones(updated);
    },
    [zones, persistZones],
  );

  const handleMoveDown = useCallback(
    async (index: number) => {
      if (index >= zones.length - 1) return;
      const updated = [...zones];
      [updated[index], updated[index + 1]] = [
        updated[index + 1],
        updated[index],
      ];
      await persistZones(updated);
    },
    [zones, persistZones],
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="World Clock"
      searchBarPlaceholder="Search time zones..."
    >
      {zones.length === 0 && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Time Zones"
          description="Add a timezone to get started."
          actions={
            <ActionPanel>
              <Action
                title="Add Timezone"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <AddTimezoneView existingZones={zones} onAdd={handleAdd} />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      )}

      {zones.map((zone, index) => {
        const timeDiff = getTimeDifference(now, zone.timezone);
        const isLocal = timeDiff === "same time";

        return (
          <List.Item
            key={`${zone.label}-${zone.timezone}-${index}`}
            title={zone.label}
            subtitle={formatClockDate(now, zone.timezone)}
            icon={{
              source: Icon.Globe,
              tintColor: isLocal ? Color.Blue : Color.SecondaryText,
            }}
            accessories={[
              {
                tag: {
                  value: timeDiff,
                  color: isLocal ? Color.Blue : Color.SecondaryText,
                },
              },
              { text: getUtcOffset(now, zone.timezone) },
              { text: formatClockTime(now, zone.timezone) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Add Timezone"
                  icon={Icon.Plus}
                  onAction={() =>
                    push(
                      <AddTimezoneView
                        existingZones={zones}
                        onAdd={handleAdd}
                      />,
                    )
                  }
                />
                {index > 0 && (
                  <Action
                    title="Move up"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                    onAction={() => handleMoveUp(index)}
                  />
                )}
                {index < zones.length - 1 && (
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                    onAction={() => handleMoveDown(index)}
                  />
                )}
                <Action
                  title="Remove Timezone"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => handleRemove(index)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
