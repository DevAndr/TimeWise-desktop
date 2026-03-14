import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  startTracking: () => ipcRenderer.invoke("tracker:start"),
  stopTracking: () => ipcRenderer.invoke("tracker:stop"),
  getSessions: () => ipcRenderer.invoke("tracker:sessions"),
  getTodaySessions: () => ipcRenderer.invoke("tracker:today"),
  getCurrentSession: () => ipcRenderer.invoke("tracker:current"),
  getHistory: () => ipcRenderer.invoke("tracker:history"),

  // Sync
  syncNow: () => ipcRenderer.invoke("sync:now"),
  getSyncConfig: () => ipcRenderer.invoke("sync:getConfig"),
  setSyncConfig: (config: { apiUrl?: string; apiToken?: string }) =>
    ipcRenderer.invoke("sync:setConfig", config),

  // Analytics
  apiFetch: (path: string) => ipcRenderer.invoke("api:fetch", path),
});
