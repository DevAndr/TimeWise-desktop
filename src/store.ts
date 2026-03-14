import Store from "electron-store";
import type { ActivitySession } from "./tracker";

interface StoreSchema {
  sessions: ActivitySession[];
}

const store = new Store<StoreSchema>({
  name: "activity-data",
  defaults: {
    sessions: [],
  },
});

export function loadSessions(): ActivitySession[] {
  return store.get("sessions");
}

export function saveSessions(sessions: ActivitySession[]) {
  store.set("sessions", sessions);
}

export function appendSessions(newSessions: ActivitySession[]) {
  const existing = loadSessions();
  store.set("sessions", [...existing, ...newSessions]);
}
