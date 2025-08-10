import { contextBridge, clipboard } from "electron";

// Expose a minimal, explicit API to the renderer
contextBridge.exposeInMainWorld("electronAPI", {
	clipboard: {
		writeText: (text: string) => clipboard.writeText(text ?? ""),
		readText: () => clipboard.readText(),
	},
});

// No other globals exposed. Keep preload small and deterministic.
