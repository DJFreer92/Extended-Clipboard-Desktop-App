import { app, BrowserWindow } from "electron";
import * as path from "path";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
	mainWindow = new BrowserWindow({
	width: 800,
	height: 600,
	show: false,
	center: true,
	backgroundColor: "#ffffff",
	webPreferences: {
		preload: path.join(__dirname, "preload.js")
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
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
// 'activate' is handled after whenReady
