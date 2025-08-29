// Web-specific clipboard management hook
import { useState, useCallback, useEffect } from 'react';
import { isWebBuild, canAccessClipboard, platformAPI } from '../utils/platform';

interface WebClipboardState {
  hasPermission: boolean;
  isSupported: boolean;
  lastError: string | null;
}

export function useWebClipboard() {
  const [state, setState] = useState<WebClipboardState>({
    hasPermission: false,
    isSupported: Boolean(canAccessClipboard),
    lastError: null,
  });

  // Check clipboard permission status
  const checkPermission = useCallback(async () => {
    if (!isWebBuild || !canAccessClipboard) return;

    try {
      // Try to read clipboard to check permission
      const permission = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
      setState(prev => ({
        ...prev,
        hasPermission: permission.state === 'granted',
        lastError: null,
      }));
    } catch (error) {
      console.warn('Permission check failed:', error);
      setState(prev => ({
        ...prev,
        lastError: 'Permission check failed',
      }));
    }
  }, []);

  // Request clipboard permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isWebBuild || !canAccessClipboard) return false;

    try {
      // Attempt to read clipboard - this will trigger permission prompt
      await navigator.clipboard.readText();
      setState(prev => ({
        ...prev,
        hasPermission: true,
        lastError: null,
      }));
      return true;
    } catch (error) {
      console.warn('Clipboard permission denied:', error);
      setState(prev => ({
        ...prev,
        hasPermission: false,
        lastError: 'Clipboard access denied',
      }));
      return false;
    }
  }, []);

  // Read clipboard with permission handling
  const readClipboard = useCallback(async (): Promise<string | null> => {
    if (!isWebBuild) return null;

    try {
      const text = await platformAPI.readClipboard();
      setState(prev => ({
        ...prev,
        lastError: null,
      }));
      return text;
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: 'Failed to read clipboard',
      }));
      return null;
    }
  }, []);

  // Write to clipboard
  const writeClipboard = useCallback(async (text: string): Promise<boolean> => {
    const success = await platformAPI.writeClipboard(text);
    if (!success) {
      setState(prev => ({
        ...prev,
        lastError: 'Failed to write to clipboard',
      }));
    }
    return success;
  }, []);

  useEffect(() => {
    if (isWebBuild) {
      checkPermission();
    }
  }, [checkPermission]);

  return {
    ...state,
    requestPermission,
    readClipboard,
    writeClipboard,
    checkPermission,
  };
}
