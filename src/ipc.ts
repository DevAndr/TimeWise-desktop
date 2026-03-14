import { ipcMain, net } from "electron";
import { getSessions, getTodaySessions, getCurrentSession, startTracking, stopTracking } from "./tracker";
import { loadSessions, saveSessions } from "./store";
import { getSyncConfig, setSyncConfig, syncSessions } from "./sync";
import type { ActivitySession } from "./tracker";

export function registerIpcHandlers() {
  ipcMain.handle("tracker:start", () => {
    startTracking((sessions) => {
      saveSessions(sessions);
    });
    return { ok: true };
  });

  ipcMain.handle("tracker:stop", () => {
    stopTracking();
    saveSessions(getSessions());
    return { ok: true };
  });

  ipcMain.handle("tracker:sessions", (): ActivitySession[] => {
    return getSessions();
  });

  ipcMain.handle("tracker:today", (): ActivitySession[] => {
    return getTodaySessions();
  });

  ipcMain.handle("tracker:current", () => {
    return getCurrentSession();
  });

  ipcMain.handle("tracker:history", (): ActivitySession[] => {
    return loadSessions();
  });

  // Sync
  ipcMain.handle("sync:now", async () => {
    const sessions = getSessions();
    return syncSessions(sessions);
  });

  ipcMain.handle("sync:getConfig", () => {
    return getSyncConfig();
  });

  ipcMain.handle("sync:setConfig", (_event, config: { apiUrl?: string; apiToken?: string }) => {
    setSyncConfig(config);
    return { ok: true };
  });

  // Analytics API proxy
  ipcMain.handle("api:fetch", async (_event, path: string) => {
    const { apiUrl, apiToken } = getSyncConfig();
    if (!apiToken) {
      return { error: "API token not configured", data: null };
    }
    try {
      const response = await net.fetch(`${apiUrl}${path}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (!response.ok) {
        const text = await response.text();
        return { error: `HTTP ${response.status}: ${text}`, data: null };
      }
      const data = await response.json();
      return { error: null, data };
    } catch (err) {
      return { error: String(err), data: null };
    }
  });
}
