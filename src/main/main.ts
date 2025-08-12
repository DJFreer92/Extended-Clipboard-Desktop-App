import { app, BrowserWindow, ipcMain, clipboard } from "electron";
import * as path from "path";
import { setInterval as setNodeInterval } from "timers";
import { execFile } from "child_process";
import { promisify } from "util";

let mainWindow: BrowserWindow | null = null;
let bgInterval: NodeJS.Timeout | null = null;
let lastClipboard: string = "";

const execFileAsync = promisify(execFile);

async function getFrontmostAppName(): Promise<string | undefined> {
	// Currently implemented for macOS only; other platforms fall back to Electron app name.
	if (process.platform !== 'darwin') return undefined;
	try {
		// AppleScript via System Events to get the name of the frontmost application process.
		const script = "tell application \"System Events\" to get name of first application process whose frontmost is true";
		const { stdout } = await execFileAsync('osascript', ['-e', script], { timeout: 1000 });
		const name = stdout.trim();
		if (!name) return undefined;
		// If it's our own app (Electron app name) just return our configured name
		if (name === app.getName()) return name;
		// Special handling: Some Electron-based apps may report generic 'Electron'.
		// User requirement: Treat 'Electron' as 'Visual Studio Code' unless THIS app is focused.
		if (name === 'Electron') {
			// If our window is focused, attribute to our own app name; otherwise assume VS Code.
			if (mainWindow?.isFocused()) return app.getName();
			return 'Visual Studio Code';
		}
		return name;
	} catch {
		return undefined;
	}
}

function createWindow() {
	mainWindow = new BrowserWindow({
	width: 800,
	height: 600,
	show: false,
	center: true,
	backgroundColor: "#ffffff",
	webPreferences: {
	preload: path.join(__dirname, "preload.js"),
	nodeIntegration: false,
	contextIsolation: true,
	webSecurity: true,
	disableBlinkFeatures: "Auxclick"
	}
	});

	const isDev = !app.isPackaged;
	if (isDev) {
		console.log("Loading renderer from Vite dev server...");
		mainWindow.loadURL("http://localhost:5174");
		mainWindow.webContents.openDevTools();
	} else {
		const prodIndex = path.join(__dirname, "../index.html");
		console.log("Loading renderer from:", prodIndex);
		mainWindow.loadFile(prodIndex);
	}

	mainWindow.once("ready-to-show", () => {
		console.log("Main window ready to show");
		mainWindow?.show();
	});

	mainWindow.webContents.on("did-finish-load", () => {
		console.log("Renderer finished load");
	});

	mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
		console.error("Renderer failed to load", { code, desc, url });
	});

	mainWindow.on("closed", () => (mainWindow = null));
}

app.whenReady().then(() => {
	createWindow();
	try { lastClipboard = clipboard.readText() || ""; } catch {}
		// Start polling system clipboard even when the app is unfocused
	const tick = async () => {
		try {
			const text = clipboard.readText() || "";
			if (!text || text === lastClipboard) return;
			lastClipboard = text;
				// Determine frontmost app name (best-effort) and notify renderer; renderer will perform API call and update UI
			let appName: string | undefined;
			try { appName = await getFrontmostAppName(); } catch {}
			mainWindow?.webContents.send('clipboard:new', { text, appName });
		} catch {}
	};
	bgInterval = setNodeInterval(tick, 100); // 0.1s polling

	// When renderer asks, report that background polling is active so it can disable its own poller
	ipcMain.handle('clipboard:isBackgroundActive', async () => true);
	ipcMain.handle('app:name', async () => app.getName()); // Electron app name
	ipcMain.handle('app:frontmost', async () => {
		try { return await getFrontmostAppName(); } catch { return undefined; }
	});

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
// 'activate' is handled after whenReady

app.on('before-quit', () => {
	if (bgInterval) clearInterval(bgInterval);
	bgInterval = null;
});
