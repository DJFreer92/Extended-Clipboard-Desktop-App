import { app, BrowserWindow, ipcMain, clipboard, nativeImage, Menu, Tray, screen } from "electron";
import * as path from "path";
import { setInterval as setNodeInterval } from "timers";
import { execFile } from "child_process";
import { promisify } from "util";

let mainWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let bgInterval: NodeJS.Timeout | null = null;
let lastClipboard: string = "";
let tray: Tray | null = null;
let trayClips: any[] = [];
let traySearchQuery: string = "";

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

function createTrayWindow() {
	console.log('createTrayWindow called, current trayWindow:', trayWindow ? 'exists' : 'null');

	if (trayWindow && !trayWindow.isDestroyed()) {
		console.log('Returning existing tray window');
		return trayWindow;
	}

	console.log('Creating new tray window...');

	// Get cursor position for positioning
	const cursorPosition = screen.getCursorScreenPoint();
	const primaryDisplay = screen.getPrimaryDisplay();
	const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

	// Position the window near the cursor but ensure it stays on screen
	const windowWidth = 400;
	const windowHeight = 580;
	let x = cursorPosition.x - windowWidth / 2;
	let y = cursorPosition.y + 10; // Position below cursor

	// Ensure window stays on screen
	if (x + windowWidth > screenWidth) {
		x = screenWidth - windowWidth - 10;
	}
	if (x < 10) {
		x = 10;
	}
	if (y + windowHeight > screenHeight) {
		y = cursorPosition.y - windowHeight - 10; // Position above cursor instead
	}
	if (y < 10) {
		y = 10;
	}

	console.log('Creating BrowserWindow with dimensions:', { windowWidth, windowHeight, x, y });

	trayWindow = new BrowserWindow({
		width: windowWidth,
		height: windowHeight,
		x: x,
		y: y,
		show: false,
		frame: false,
		resizable: false,
		skipTaskbar: true,
		alwaysOnTop: true,
		transparent: true,
		hasShadow: true,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, "preload.js"),
		},
	});

	// Load the tray window HTML
	if (app.isPackaged) {
		console.log('Loading tray window from file:', path.join(__dirname, "../tray.html"));
		trayWindow.loadFile(path.join(__dirname, "../tray.html"));
	} else {
		const trayUrl = process.env.VITE_DEV_SERVER_URL ?
			`${process.env.VITE_DEV_SERVER_URL}/tray.html` :
			'http://localhost:5174/tray.html';
		console.log('Loading tray window from URL:', trayUrl);
		trayWindow.loadURL(trayUrl);
	}

	// Add debugging for tray window events
	trayWindow.webContents.on('did-finish-load', () => {
		console.log('Tray window finished loading');
	});

	trayWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
		console.error('Tray window failed to load:', { code, desc, url });
	});

	// Hide window when it loses focus
	trayWindow.on('blur', () => {
		if (trayWindow && !trayWindow.isDestroyed()) {
			trayWindow.hide();
		}
	});

	trayWindow.on('closed', () => {
		trayWindow = null;
	});

	// Setup IPC for tray window communication
	setupTrayWindowIPC();

	return trayWindow;
}

function setupTrayWindowIPC() {
	// Handle requests from tray window
	ipcMain.on('tray:load-clips', () => {
		if (trayWindow && !trayWindow.isDestroyed()) {
			trayWindow.webContents.send('tray:clips-updated', trayClips);
		}
	});

	ipcMain.on('tray:copy-clip', (_event, clipId) => {
		const clip = trayClips.find(c => c.Id === clipId);
		if (clip) {
			clipboard.writeText(clip.Content);
			console.log('Copied clip from tray:', clipId, 'content length:', clip.Content.length);

			// Send feedback to main window if available
			if (mainWindow && !mainWindow.isDestroyed()) {
				mainWindow.webContents.send('tray:copied', { id: clipId });
			}
		}
	});

	ipcMain.on('tray:search', (_event, query) => {
		traySearchQuery = query;
		if (trayWindow && !trayWindow.isDestroyed()) {
			trayWindow.webContents.send('tray:search-updated', query);
		}
	});

	ipcMain.on('tray:close', () => {
		if (trayWindow && !trayWindow.isDestroyed()) {
			trayWindow.hide();
		}
	});

	ipcMain.on('tray:hide-window', () => {
		if (trayWindow && !trayWindow.isDestroyed()) {
			trayWindow.hide();
		}
	});

	ipcMain.on('tray:open-main-app', () => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		} else {
			createWindow();
		}
	});
}

function createTray() {
	// Only create tray on macOS
	if (process.platform !== 'darwin') {
		console.log('Tray not supported on platform:', process.platform);
		return;
	}

	console.log('Creating custom tray window for macOS...');

	// Resolve tray icon (should be 16x16 or 18x18 for tray)
	const resolveTrayIcon = () => {
		const isDev = !app.isPackaged;
		const candidates = [
			// Use the same app icon for tray - Electron will resize automatically
			...(isDev ? [
				path.join(process.cwd(), "src", "assets", "app_icon", "Extended Clipboard_App_Icon.png"),
				path.join(process.cwd(), "Extended Clipboard_App_Icon.png"),
			] : []),
			path.join(process.resourcesPath ?? "", "Extended Clipboard_App_Icon.png"),
			path.join(__dirname, "../Extended Clipboard_App_Icon.png"),
			path.join(process.cwd(), "src", "assets", "app_icon", "Extended Clipboard_App_Icon.png"),
		].filter(Boolean) as string[];

		console.log('Trying tray icon candidates:', candidates);

		for (const p of candidates) {
			try {
				const img = nativeImage.createFromPath(p);
				if (!img.isEmpty()) {
					console.log('Found tray icon at:', p);
					// Resize for tray use
					return img.resize({ width: 18, height: 18 });
				}
			} catch (error) {
				console.log('Failed to load icon from:', p, error);
			}
		}
		console.log('No tray icon found, using default');
		return undefined;
	};

	const trayIcon = resolveTrayIcon();
	if (!trayIcon) {
		console.log('Failed to create tray icon, tray will not be created');
		return;
	}

	tray = new Tray(trayIcon);
	tray.setToolTip('Extended Clipboard');
	console.log('Tray created successfully');

	// Handle tray click to show/hide custom window
	tray.on('click', () => {
		console.log('Tray clicked - showing custom window');

		if (trayWindow && !trayWindow.isDestroyed()) {
			console.log('Tray window exists, current visibility:', trayWindow.isVisible());
			if (trayWindow.isVisible()) {
				console.log('Hiding tray window');
				trayWindow.hide();
			} else {
				console.log('Showing existing tray window');
				// Update position before showing
				updateTrayWindowPosition();
				trayWindow.show();
				trayWindow.focus();
				// Send updated clips to the window
				trayWindow.webContents.send('tray:clips-updated', trayClips);
			}
		} else {
			console.log('Creating new tray window');
			const window = createTrayWindow();
			console.log('Tray window created, positioning...');
			updateTrayWindowPosition();
			console.log('Showing tray window...');
			window.show();
			window.focus();
			// Send initial clips after window is ready
			setTimeout(() => {
				if (window && !window.isDestroyed()) {
					console.log('Sending initial clips to tray window');
					window.webContents.send('tray:clips-updated', trayClips);
				}
			}, 100);
		}
	});

	// Right-click shows minimal context menu
	tray.on('right-click', () => {
		const contextMenu = Menu.buildFromTemplate([
			{
				label: 'Extended Clipboard',
				enabled: false
			},
			{ type: 'separator' },
			{
				label: 'Open App',
				click: () => {
					if (mainWindow) {
						if (mainWindow.isMinimized()) mainWindow.restore();
						mainWindow.focus();
					} else {
						createWindow();
					}
				}
			},
			{ type: 'separator' },
			{
				label: 'Quit',
				click: () => {
					app.quit();
				}
			}
		]);
		if (tray) {
			tray.popUpContextMenu(contextMenu);
		}
	});
}

function updateTrayWindowPosition() {
	if (!tray || !trayWindow || trayWindow.isDestroyed()) return;

	try {
		const trayBounds = tray.getBounds();
		const windowBounds = trayWindow.getBounds();
		const primaryDisplay = screen.getPrimaryDisplay();
		const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

		// Calculate position relative to tray icon
		let x = trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2);
		let y = trayBounds.y + trayBounds.height + 5;

		// Ensure window stays on screen
		if (x + windowBounds.width > screenWidth) {
			x = screenWidth - windowBounds.width - 10;
		}
		if (x < 10) {
			x = 10;
		}

		// If window would go below screen, position above tray instead
		if (y + windowBounds.height > screenHeight) {
			y = trayBounds.y - windowBounds.height - 5;
		}
		if (y < 10) {
			y = 10;
		}

		trayWindow.setPosition(x, y);
	} catch (error) {
		console.log('Failed to update tray window position:', error);
		// Fallback to cursor position
		const cursorPosition = screen.getCursorScreenPoint();
		trayWindow.setPosition(cursorPosition.x - 160, cursorPosition.y + 10);
	}
}

function updateTrayClips() {
	// Update the tray window if it exists and is visible
	if (trayWindow && !trayWindow.isDestroyed() && trayWindow.isVisible()) {
		trayWindow.webContents.send('tray:clips-updated', trayClips);
	}
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
	createTray();
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

	// Tray IPC handlers
	ipcMain.handle('tray:isSupported', async () => process.platform === 'darwin');
	ipcMain.handle('tray:updateClips', async (_, clips: any[]) => {
		trayClips = clips;
		updateTrayClips();
	});
	ipcMain.handle('tray:setSearchQuery', async (_, query: string) => {
		traySearchQuery = query;
		updateTrayClips();
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
	if (tray) {
		tray.destroy();
		tray = null;
	}
});
