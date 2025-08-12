import { contextBridge, clipboard, ipcRenderer } from "electron";

// Expose a minimal, explicit API to the renderer
contextBridge.exposeInMainWorld("electronAPI", {
	clipboard: {
		writeText: (text: string) => clipboard.writeText(text ?? ""),
		readText: () => clipboard.readText(),
	},
	app: {
		getName: () => ipcRenderer.invoke('app:name'),
	},
	frontmostApp: {
		getName: () => ipcRenderer.invoke('app:frontmost'),
	},
	background: {
		isActive: async (): Promise<boolean> => ipcRenderer.invoke('clipboard:isBackgroundActive'),
		onNew: (cb: (payload: { text: string }) => void) => {
			const listener = (_e: any, payload: { text: string }) => cb(payload);
			ipcRenderer.on('clipboard:new', listener);
			return () => ipcRenderer.off('clipboard:new', listener);
		},
	},
});

// No other globals exposed. Keep preload small and deterministic.
