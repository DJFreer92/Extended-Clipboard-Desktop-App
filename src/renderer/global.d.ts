export {};

declare global {
  interface Window {
    electronAPI?: {
      clipboard?: {
        writeText?: (text: string) => void;
        readText?: () => string;
      };
      app?: { getName?: () => Promise<string>; };
      frontmostApp?: { getName?: () => Promise<string | undefined>; };
      background?: {
        isActive?: () => Promise<boolean>;
        onNew?: (cb: (payload: { text: string }) => void) => () => void;
      };
      tray?: {
        isSupported?: () => Promise<boolean>;
        updateClips?: (clips: any[]) => Promise<void>;
        setSearchQuery?: (query: string) => Promise<void>;
        onRefreshRequest?: (cb: () => void) => () => void;
        onCopied?: (cb: (payload: { id: string }) => void) => () => void;
      };
      ipcRenderer?: {
        send?: (channel: string, ...args: any[]) => void;
        on?: (channel: string, listener: (...args: any[]) => void) => void;
        removeAllListeners?: (channel: string) => void;
      };
    };
  }
}
