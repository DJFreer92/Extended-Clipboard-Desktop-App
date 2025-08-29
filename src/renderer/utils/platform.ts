// Environment detection utilities for web vs Electron builds

declare global {
  const __IS_WEB_BUILD__: boolean;
}

export const isWebBuild = typeof __IS_WEB_BUILD__ !== 'undefined' && __IS_WEB_BUILD__;
export const isElectronBuild = !isWebBuild && typeof window !== 'undefined' && window.electronAPI;

// Feature detection for capabilities that differ between web and Electron
export const canAccessClipboard = isElectronBuild || (typeof navigator !== 'undefined' && 'clipboard' in navigator);
export const canRunInBackground = isElectronBuild;
export const canAccessFileSystem = isElectronBuild;

// Platform-specific API wrappers
export const platformAPI = {
  // Clipboard access - uses Electron API in desktop, Web Clipboard API in browser
  async readClipboard(): Promise<string | null> {
    if (isElectronBuild && window.electronAPI?.clipboard?.readText) {
      return window.electronAPI.clipboard.readText() || null;
    } else if (canAccessClipboard) {
      try {
        return await navigator.clipboard.readText();
      } catch (error) {
        console.warn('Clipboard access denied:', error);
        return null;
      }
    }
    return null;
  },

  async writeClipboard(text: string): Promise<boolean> {
    if (isElectronBuild && window.electronAPI?.clipboard?.writeText) {
      window.electronAPI.clipboard.writeText(text);
      return true;
    } else if (canAccessClipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.warn('Clipboard write failed:', error);
        return false;
      }
    }
    return false;
  },

  // System notifications
  showNotification(title: string, body?: string): void {
    if (isElectronBuild && window.electronAPI?.ipcRenderer?.send) {
      // Use IPC to show system notification in Electron
      window.electronAPI.ipcRenderer.send('show-notification', { title, body });
    } else if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body });
          }
        });
      }
    }
  },

  // App lifecycle - limited in web context
  minimize(): void {
    if (isElectronBuild && window.electronAPI?.ipcRenderer?.send) {
      window.electronAPI.ipcRenderer.send('window-minimize');
    }
    // In web context, we can't actually minimize the window
  },

  close(): void {
    if (isElectronBuild && window.electronAPI?.ipcRenderer?.send) {
      window.electronAPI.ipcRenderer.send('window-close');
    } else {
      // In web context, just close the current tab/window if possible
      window.close();
    }
  },

  // Get app name
  async getAppName(): Promise<string> {
    if (isElectronBuild && window.electronAPI?.app?.getName) {
      return (await window.electronAPI.app.getName()) || 'Extended Clipboard';
    }
    return 'Extended Clipboard';
  }
};

// Web-specific features like service worker registration
export const webFeatures = {
  async registerServiceWorker(): Promise<void> {
    if (isWebBuild && 'serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  },

  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
};
