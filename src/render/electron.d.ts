interface ElectronAPI {
  startTracking: () => Promise<{ ok: boolean }>;
  stopTracking: () => Promise<{ ok: boolean }>;
  getSessions: () => Promise<
    Array<{
      appName: string;
      windowTitle: string;
      startTime: number;
      endTime: number;
      duration: number;
    }>
  >;
  getTodaySessions: () => Promise<
    Array<{
      appName: string;
      windowTitle: string;
      startTime: number;
      endTime: number;
      duration: number;
    }>
  >;
  getHistory: () => Promise<
    Array<{
      appName: string;
      windowTitle: string;
      startTime: number;
      endTime: number;
      duration: number;
    }>
  >;
}

interface Window {
  electronAPI: ElectronAPI;
}
