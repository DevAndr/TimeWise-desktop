import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  startTracking: () => ipcRenderer.invoke("tracker:start"),
  stopTracking: () => ipcRenderer.invoke("tracker:stop"),
  getSessions: () => ipcRenderer.invoke("tracker:sessions"),
  getTodaySessions: () => ipcRenderer.invoke("tracker:today"),
  getHistory: () => ipcRenderer.invoke("tracker:history"),
});
