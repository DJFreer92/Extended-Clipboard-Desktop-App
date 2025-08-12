import { app, BrowserWindow, ipcMain, clipboard } from "electron";
import * as path from "path";
import { setInterval as setNodeInterval } from "timers";

let mainWindow: BrowserWindow | null = null;
let bgInterval: NodeJS.Timeout | null = null;
let lastClipboard: string = "";

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
				// Notify renderer; renderer will perform API call and update UI
			mainWindow?.webContents.send('clipboard:new', { text });
		} catch {}
	};
	bgInterval = setNodeInterval(tick, 1500);

	// When renderer asks, report that background polling is active so it can disable its own poller
	ipcMain.handle('clipboard:isBackgroundActive', async () => true);

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
