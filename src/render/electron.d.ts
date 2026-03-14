interface ActivitySession {
  appName: string;
  windowTitle: string;
  startTime: number;
  endTime: number;
  duration: number;
}

interface SyncResult {
  synced: number;
  error?: string;
}

interface SyncConfig {
  apiUrl: string;
  apiToken: string;
}

interface ElectronAPI {
  startTracking: () => Promise<{ ok: boolean }>;
  stopTracking: () => Promise<{ ok: boolean }>;
  getSessions: () => Promise<ActivitySession[]>;
  getTodaySessions: () => Promise<ActivitySession[]>;
  getHistory: () => Promise<ActivitySession[]>;

  syncNow: () => Promise<SyncResult>;
  getSyncConfig: () => Promise<SyncConfig>;
  setSyncConfig: (config: Partial<SyncConfig>) => Promise<{ ok: boolean }>;

  apiFetch: <T = unknown>(path: string) => Promise<{ error: string | null; data: T | null }>;
}

interface Window {
  electronAPI: ElectronAPI;
}
