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
	tray: {
		isSupported: () => ipcRenderer.invoke('tray:isSupported'),
		updateClips: (clips: any[]) => ipcRenderer.invoke('tray:updateClips', clips),
		setSearchQuery: (query: string) => ipcRenderer.invoke('tray:setSearchQuery', query),
		onRefreshRequest: (cb: () => void) => {
			const listener = () => cb();
			ipcRenderer.on('tray:refresh-request', listener);
			return () => ipcRenderer.off('tray:refresh-request', listener);
		},
		onCopied: (cb: (payload: { id: string }) => void) => {
			const listener = (_e: any, payload: { id: string }) => cb(payload);
			ipcRenderer.on('tray:copied', listener);
			return () => ipcRenderer.off('tray:copied', listener);
		},
	},
	ipcRenderer: {
		send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
		on: (channel: string, listener: (...args: any[]) => void) => ipcRenderer.on(channel, listener),
		removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
	},
});

// No other globals exposed. Keep preload small and deterministic.
