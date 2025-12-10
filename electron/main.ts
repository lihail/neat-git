import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { registerDialogHandlers } from "./handlers/dialogHandlers";
import { registerSshHandlers } from "./handlers/sshHandlers";
import { registerGitHandlers } from "./handlers/gitHandlers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// In production (packaged app), __dirname will be inside app.asar
// We need to properly resolve paths whether in asar or not
const APP_ROOT = isDev
  ? path.join(__dirname, "../")
  : path.join(__dirname, "../");

const RENDERER_DIST = path.join(APP_ROOT, "dist");

process.env.APP_ROOT = APP_ROOT;
const VITE_DEV_SERVER_URL = isDev ? "http://localhost:8080" : undefined;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (process.platform === "win32") app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win: BrowserWindow | null = null;
const preload = path.join(__dirname, "preload.js");
const indexHtml = path.join(RENDERER_DIST, "index.html");

async function createWindow() {
  win = new BrowserWindow({
    title: "NeatGit - Modern Git Client",
    icon: path.join(process.env.VITE_PUBLIC!, "favicon.png"),
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Test active push message to Renderer-process
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    // Load from Vite dev server
    console.log("Loading from dev server:", VITE_DEV_SERVER_URL);
    win.loadURL(VITE_DEV_SERVER_URL).catch((err) => {
      console.error("Failed to load from dev server:", err);
      // Fallback to file if dev server fails
      win?.loadFile(indexHtml);
    });
  } else {
    // Load from built files
    win.loadFile(indexHtml).catch((err) => {
      console.error("Failed to load file:", err);
      console.error("Tried to load:", indexHtml);
    });
  }
}

registerSshHandlers();
registerGitHandlers();

app.whenReady().then(() => {
  createWindow();
  if (win) {
    registerDialogHandlers(win);
  }
});

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});
