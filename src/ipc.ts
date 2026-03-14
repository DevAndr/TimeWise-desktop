import { ipcMain } from "electron";
import { getSessions, getTodaySessions, startTracking, stopTracking } from "./tracker";
import { loadSessions, saveSessions } from "./store";
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

  ipcMain.handle("tracker:history", (): ActivitySession[] => {
    return loadSessions();
  });
}
