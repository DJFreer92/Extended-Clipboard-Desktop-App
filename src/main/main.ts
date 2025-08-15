import { app, BrowserWindow, ipcMain, clipboard, nativeImage, Menu } from "electron";
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
		// If macOS reports generic 'Electron' (common in dev), and it's our focused window, map to our app name; otherwise leave as 'Electron'.
		if (name === 'Electron' && mainWindow?.isFocused()) return app.getName();
		return name;
	} catch {
		return undefined;
	}
}

function createWindow() {
	// Best-effort resolve app icon from common locations in dev and prod
	const resolveIcon = () => {
		const isDev = !app.isPackaged;
		const candidates = [
			// Prefer dev paths when running in dev
			...(isDev ? [
				path.join(process.cwd(), "src", "assets", "app_icon", "Extended Clipboard_App_Icon.png"),
				path.join(process.cwd(), "Extended Clipboard_App_Icon.png"),
				path.join(process.cwd(), "assets", "Extended Clipboard_App_Icon.png"),
			] : []),
			// When packaged, resourcesPath is typically .../Extended Clipboard.app/Contents/Resources
			path.join(process.resourcesPath ?? "", "Extended Clipboard_App_Icon.png"),
			// When running from built dist
			path.join(__dirname, "../Extended Clipboard_App_Icon.png"),
			// As final fallbacks, also check dev paths even if packaged
			path.join(process.cwd(), "src", "assets", "app_icon", "Extended Clipboard_App_Icon.png"),
			path.join(process.cwd(), "Extended Clipboard_App_Icon.png"),
			path.join(process.cwd(), "assets", "Extended Clipboard_App_Icon.png"),
		].filter(Boolean) as string[];
		for (const p of candidates) {
			try {
				const img = nativeImage.createFromPath(p);
				if (!img.isEmpty()) return img;
			} catch {}
		}
		return undefined;
	};
	const appIcon = resolveIcon();

	mainWindow = new BrowserWindow({
	width: 800,
	height: 600,
	show: false,
	center: true,
	backgroundColor: "#ffffff",
	icon: appIcon, // used on Windows/Linux; ignored on macOS windows but fine to set
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
	// Ensure the app has a friendly name in dev and production
	try {
		app.setName('Extended Clipboard');
		// Also set process title in dev (helps some shells/task switchers)
		process.title = 'Extended Clipboard';
	} catch {}
	// On macOS, explicitly set an application menu so the App menu label uses app.name
	if (process.platform === 'darwin') {
		try {
			const appLabel = 'Extended Clipboard';
			try { app.setAboutPanelOptions({ applicationName: appLabel }); } catch {}
			const menu = Menu.buildFromTemplate([
				{
					label: appLabel,
					submenu: [
						{ role: 'about', label: `About ${appLabel}` },
						{ type: 'separator' },
						{ role: 'services' },
						{ type: 'separator' },
						{ role: 'hide', label: `Hide ${appLabel}` },
						{ role: 'hideOthers' },
						{ role: 'unhide' },
						{ type: 'separator' },
						{ role: 'quit', label: `Quit ${appLabel}` },
					],
				},
				{ role: 'fileMenu' },
				{ role: 'editMenu' },
				{ role: 'viewMenu' },
				{ role: 'windowMenu' },
			]);
			Menu.setApplicationMenu(menu);
		} catch {}
	}
	// Set Dock icon on macOS if available
	try {
		if (process.platform === 'darwin' && app.dock) {
			const isDev = !app.isPackaged;
			const dockCandidates = [
				...(isDev ? [
					path.join(process.cwd(), "src", "assets", "app_icon", "Extended Clipboard_App_Icon.png"),
					path.join(process.cwd(), "Extended Clipboard_App_Icon.png"),
					path.join(process.cwd(), "assets", "Extended Clipboard_App_Icon.png"),
				] : []),
				path.join(process.resourcesPath ?? "", "Extended Clipboard_App_Icon.png"),
				path.join(__dirname, "../Extended Clipboard_App_Icon.png"),
				path.join(process.cwd(), "src", "assets", "app_icon", "Extended Clipboard_App_Icon.png"),
				path.join(process.cwd(), "Extended Clipboard_App_Icon.png"),
				path.join(process.cwd(), "assets", "Extended Clipboard_App_Icon.png"),
			];
			for (const p of dockCandidates) {
				try {
					const img = nativeImage.createFromPath(p);
					if (!img.isEmpty()) { app.dock.setIcon(img); break; }
				} catch {}
			}
		}
	} catch {}
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
	bgInterval = setNodeInterval(tick, 500); // 0.5s polling

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
