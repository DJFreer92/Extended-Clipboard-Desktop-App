import { useEffect, useState, useCallback } from "react";
import { ClipModel } from "../../../../models/clip";

export function useTray() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  // Check if tray is supported (macOS only)
  useEffect(() => {
    const checkSupport = async () => {
      try {
        if (window.electronAPI?.tray?.isSupported) {
          const supported = await window.electronAPI.tray.isSupported();
          setIsSupported(supported);
          setIsEnabled(supported); // Auto-enable if supported
        }
      } catch (error) {
        console.warn('Failed to check tray support:', error);
        setIsSupported(false);
        setIsEnabled(false);
      }
    };

    checkSupport();
  }, []);

  // Update tray with clips data
  const updateTrayClips = useCallback(async (clips: ClipModel[]) => {
    if (!isEnabled || !window.electronAPI?.tray?.updateClips) return;

    try {
      // Send simplified clip data to tray
      const trayClips = clips.map(clip => ({
        Id: clip.Id,
        Content: clip.Content,
        Timestamp: clip.Timestamp,
        FromAppName: clip.FromAppName,
        // Don't send tags to tray
      }));

      await window.electronAPI.tray.updateClips(trayClips);
    } catch (error) {
      console.warn('Failed to update tray clips:', error);
    }
  }, [isEnabled]);

  // Set search query for tray filtering
  const setTraySearchQuery = useCallback(async (query: string) => {
    if (!isEnabled || !window.electronAPI?.tray?.setSearchQuery) return;

    try {
      await window.electronAPI.tray.setSearchQuery(query);
    } catch (error) {
      console.warn('Failed to set tray search query:', error);
    }
  }, [isEnabled]);

  // Listen for tray refresh requests
  const onTrayRefreshRequest = useCallback((callback: () => void) => {
    if (!isEnabled || !window.electronAPI?.tray?.onRefreshRequest) return () => {};

    try {
      return window.electronAPI.tray.onRefreshRequest(callback);
    } catch (error) {
      console.warn('Failed to set up tray refresh listener:', error);
      return () => {};
    }
  }, [isEnabled]);

  // Listen for tray copy events
  const onTrayCopied = useCallback((callback: (payload: { id: string }) => void) => {
    if (!isEnabled || !window.electronAPI?.tray?.onCopied) return () => {};

    try {
      return window.electronAPI.tray.onCopied(callback);
    } catch (error) {
      console.warn('Failed to set up tray copy listener:', error);
      return () => {};
    }
  }, [isEnabled]);

  return {
    isSupported,
    isEnabled,
    updateTrayClips,
    setTraySearchQuery,
    onTrayRefreshRequest,
    onTrayCopied,
  };
}
