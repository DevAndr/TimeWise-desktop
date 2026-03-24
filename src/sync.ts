import { JsonStore } from "./json-store";
import type { ActivitySession } from "./tracker";
import { net } from "electron";

interface SyncConfig {
  apiUrl: string;
  apiToken: string;
  browserToken: string;
}

interface SyncState {
  lastSyncedAt: number; // epoch ms — sessions with endTime > this need syncing
}

const configStore = new JsonStore<SyncConfig>("sync-config", {
  apiUrl: "http://192.168.1.88:3031",
  apiToken: "",
  browserToken: "",
});

const syncStateStore = new JsonStore<SyncState>("sync-state", {
  lastSyncedAt: 0,
});

export function getSyncConfig(): SyncConfig {
  return {
    apiUrl: configStore.get("apiUrl"),
    apiToken: configStore.get("apiToken"),
    browserToken: configStore.get("browserToken"),
  };
}

export function setSyncConfig(config: Partial<SyncConfig>) {
  if (config.apiUrl !== undefined) configStore.set("apiUrl", config.apiUrl);
  if (config.apiToken !== undefined) configStore.set("apiToken", config.apiToken);
  if (config.browserToken !== undefined) configStore.set("browserToken", config.browserToken);
}

function sessionToDto(session: ActivitySession) {
  return {
    appName: session.appName,
    windowTitle: session.windowTitle,
    duration: session.duration,
    startedAt: new Date(session.startTime).toISOString(),
    endedAt: new Date(session.endTime).toISOString(),
  };
}

export async function syncSessions(sessions: ActivitySession[]): Promise<{ synced: number; error?: string }> {
  const { apiUrl, apiToken } = getSyncConfig();

  if (!apiToken) {
    return { synced: 0, error: "API token not configured" };
  }

  const lastSyncedAt = syncStateStore.get("lastSyncedAt");
  const unsyncedSessions = sessions.filter((s) => s.endTime > lastSyncedAt && s.duration > 0);

  if (unsyncedSessions.length === 0) {
    return { synced: 0 };
  }

  const batch = unsyncedSessions.map(sessionToDto);

  try {
    const response = await netFetch(`${apiUrl}/app-activities/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const text = await response.text();
      return { synced: 0, error: `HTTP ${response.status}: ${text}` };
    }

    // Update last synced timestamp to the latest session's endTime
    const maxEndTime = Math.max(...unsyncedSessions.map((s) => s.endTime));
    syncStateStore.set("lastSyncedAt", maxEndTime);

    return { synced: unsyncedSessions.length };
  } catch (err) {
    return { synced: 0, error: String(err) };
  }
}

export async function syncSingleSession(session: ActivitySession): Promise<{ ok: boolean; error?: string }> {
  const { apiUrl, apiToken } = getSyncConfig();

  if (!apiToken) {
    return { ok: false, error: "API token not configured" };
  }

  try {
    const response = await netFetch(`${apiUrl}/app-activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(sessionToDto(session)),
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `HTTP ${response.status}: ${text}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// Wrapper around Electron's net.fetch (works in main process, respects system proxy)
function netFetch(url: string, options: { method: string; headers: Record<string, string>; body: string }) {
  return net.fetch(url, {
    method: options.method,
    headers: options.headers,
    body: options.body,
  });
}
