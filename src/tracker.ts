import { powerMonitor } from "electron";
import { execFile } from "node:child_process";

const POLL_INTERVAL_MS = 3_000;
const IDLE_THRESHOLD_S = 120; // 2 minutes of inactivity = idle

// PowerShell script to get active window info on Windows
const PS_SCRIPT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinAPI {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
$hwnd = [WinAPI]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 512
[WinAPI]::GetWindowText($hwnd, $sb, 512) | Out-Null
$title = $sb.ToString()
[uint32]$wpid = 0
[WinAPI]::GetWindowThreadProcessId($hwnd, [ref]$wpid) | Out-Null
$proc = Get-Process -Id $wpid -ErrorAction SilentlyContinue
$name = if ($proc) { $proc.ProcessName } else { "Unknown" }
Write-Output "$name|||$title"
`;

interface ActiveWindow {
  appName: string;
  windowTitle: string;
}

function getActiveWindow(): Promise<ActiveWindow | null> {
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", PS_SCRIPT],
      { timeout: 2500 },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        const line = stdout.trim();
        const sep = line.indexOf("|||");
        if (sep === -1) {
          resolve(null);
          return;
        }
        resolve({
          appName: line.slice(0, sep),
          windowTitle: line.slice(sep + 3),
        });
      },
    );
  });
}

export interface ActivitySession {
  appName: string;
  windowTitle: string;
  startTime: number; // epoch ms
  endTime: number;
  duration: number; // ms
}

interface CurrentSession {
  appName: string;
  windowTitle: string;
  startTime: number;
}

let currentSession: CurrentSession | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let sessions: ActivitySession[] = [];
let onChange: ((sessions: ActivitySession[]) => void) | null = null;

function finishSession(): ActivitySession | null {
  if (!currentSession) return null;

  const now = Date.now();
  const session: ActivitySession = {
    appName: currentSession.appName,
    windowTitle: currentSession.windowTitle,
    startTime: currentSession.startTime,
    endTime: now,
    duration: now - currentSession.startTime,
  };
  sessions.push(session);
  currentSession = null;
  onChange?.(sessions);
  return session;
}

async function tick() {
  const idleSeconds = powerMonitor.getSystemIdleTime();
  if (idleSeconds >= IDLE_THRESHOLD_S) {
    finishSession();
    return;
  }

  const win = await getActiveWindow();

  if (!win) {
    finishSession();
    return;
  }

  // Same app — keep the session going
  if (currentSession && currentSession.appName === win.appName) {
    return;
  }

  // Different app — close previous, start new
  finishSession();
  currentSession = {
    appName: win.appName,
    windowTitle: win.windowTitle,
    startTime: Date.now(),
  };
}

export function startTracking(cb?: (sessions: ActivitySession[]) => void) {
  if (intervalId) return;
  if (cb) onChange = cb;
  intervalId = setInterval(tick, POLL_INTERVAL_MS);
  tick();
}

export function stopTracking() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  finishSession();
}

export function getSessions(): ActivitySession[] {
  return sessions;
}

export function getTodaySessions(): ActivitySession[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const ts = todayStart.getTime();
  return sessions.filter((s) => s.startTime >= ts);
}

export function getCurrentSession(): { appName: string; windowTitle: string; startTime: number; duration: number } | null {
  if (!currentSession) return null;
  return {
    appName: currentSession.appName,
    windowTitle: currentSession.windowTitle,
    startTime: currentSession.startTime,
    duration: Date.now() - currentSession.startTime,
  };
}

export function clearSessions() {
  sessions = [];
}
