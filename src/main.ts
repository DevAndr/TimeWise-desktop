import { app, BrowserWindow, Tray, Menu, nativeImage } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { registerIpcHandlers } from "./ipc";
import { startTracking, getSessions } from "./tracker";
import { saveSessions } from "./store";
import { syncSessions } from "./sync";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Hide to tray instead of closing
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.webContents.openDevTools();
};

function createTray() {
  // 16x16 simple clock icon as data URL
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA" +
    "mklEQVQ4y2NgGAWDATAyMDD8J0H/f2IG/ydG838MA/4TY8h/YjX/J8mA/8Rq/k+SAf+J" +
    "1fyfJAP+E6v5PzEa/xOr8T8xGv8To/E/MRr/E6PxPzEa/xOj8T8xGv8To/E/MRr/E6Px" +
    "PzEa/5NkADGa/5NkADGa/5NkADGa/xOj8T8xGv8To/E/MRpHwSgYDAAAwJkfEWjF4jcA" +
    "AAAASUVORK5CYII=",
  );

  tray = new Tray(icon);
  tray.setToolTip("TimeWise — трекер активности");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Открыть TimeWise",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: "separator" },
    {
      label: "Выход",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

app.on("ready", () => {
  registerIpcHandlers();
  createWindow();
  createTray();

  // Auto-start tracking when app launches
  startTracking((sessions) => {
    saveSessions(sessions);
  });

  // Auto-sync every 60 seconds
  setInterval(() => {
    const sessions = getSessions();
    if (sessions.length > 0) {
      syncSessions(sessions).catch(() => { /* silent retry next interval */ });
    }
  }, 60_000);
});

app.on("window-all-closed", () => {
  // Don't quit — keep running in tray
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});
