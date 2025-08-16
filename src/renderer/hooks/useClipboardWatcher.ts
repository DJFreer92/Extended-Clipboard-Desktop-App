import { useEffect, useRef } from 'react';
import { clipsService } from '../../services/clips/clipsService';
import { ClipModel } from '../../models/clip';

interface ClipboardWatcherOptions {
  enabled: boolean;
  deps: any[];
  onNewClip: (added: boolean) => Promise<void> | void;
  existingClips: ClipModel[];
  registerApp?: (app: string) => void;
  guardDurationMs?: number;
  onExternalClipboardChange?: () => void; // fired when system clipboard changes (even if suppressed)
}

// Hook encapsulating background or renderer polling clipboard logic
export function useClipboardWatcher(opts: ClipboardWatcherOptions) {
  const { enabled, deps, onNewClip, existingClips, registerApp, guardDurationMs = 3200, onExternalClipboardChange } = opts;
  const selfCopyGuardRef = useRef<{ text: string; expires: number } | null>(null);
  const lastClipboardTextRef = useRef<string>('');
  const suppressNextAddRef = useRef<number>(0);
  const selfInitiatedCopyRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return; // feature flag
    const bg = (window as any)?.electronAPI?.background;
    let unsubscribe: (() => void) | undefined;
    let stopped = false;
    const copyListener = (e: ClipboardEvent) => {
      // If our own UI triggered the copy (markSelfCopy recently), skip
      if (selfInitiatedCopyRef.current) return;
      onExternalClipboardChange?.();
    };
    document.addEventListener('copy', copyListener, true);

    const shouldSuppressAdd = (text: string): boolean => {
      const now = Date.now();
      const guard = selfCopyGuardRef.current;
      if (guard && now <= guard.expires && text === guard.text) {
        selfCopyGuardRef.current = null;
        return true;
      }
      if (now <= suppressNextAddRef.current && text === lastClipboardTextRef.current) return true;
      return false;
    };

    const addClip = async (text: string) => {
      try {
        let appName: string | undefined;
        try { appName = await (window as any)?.electronAPI?.frontmostApp?.getName?.(); } catch {}
        if (!appName) { try { appName = await (window as any)?.electronAPI?.app?.getName?.(); } catch {} }
        await clipsService.addClip(text, appName);
        if (appName) registerApp?.(appName);
        await onNewClip(true);
      } catch (e) { console.error('Failed to add clip', e); }
    };

    const attachBackground = () => {
      if (bg && typeof bg.isActive === 'function') {
        bg.isActive?.().then((active: boolean) => {
          if (stopped) return;
          if (active && typeof bg.onNew === 'function') {
            unsubscribe = bg.onNew(async (payload: { text: string }) => {
              try {
                const text = (payload?.text ?? '').toString();
                if (!text) return;
                if (shouldSuppressAdd(text)) {
                  lastClipboardTextRef.current = text;
                  return;
                }
                await addClip(text);
              } catch (e) { console.error('Background refresh failed', e); }
            });
          } else {
            startPolling();
          }
        }).catch(() => startPolling());
      } else {
        startPolling();
      }
    };

    let interval: any;
    let ticking = false;
    let cancelled = false;
    const primedRef = { current: !!lastClipboardTextRef.current } as { current: boolean };

    const readClipboard = async (): Promise<string> => {
      try {
        const api = (window as any)?.electronAPI;
        if (api?.clipboard?.readText) {
          const t = api.clipboard.readText();
          return t ?? '';
        }
      } catch {}
      try {
        const webClipboard: any = (navigator as any)?.clipboard;
        if (webClipboard?.readText) {
          return (await webClipboard.readText()) ?? '';
        }
      } catch {}
      return '';
    };

    const tick = async () => {
      if (cancelled) return;
      ticking = true;
      try {
        const current = await readClipboard();
        if (!primedRef.current) {
          if (current) {
            lastClipboardTextRef.current = current;
            primedRef.current = true;
          }
          return;
        }
        if (current && current !== lastClipboardTextRef.current) {
          const nowTs = Date.now();
          if (nowTs <= suppressNextAddRef.current) {
            lastClipboardTextRef.current = current;
            onExternalClipboardChange?.();
            return;
          }
          const guard = selfCopyGuardRef.current;
          const now = Date.now();
            if (guard && now <= guard.expires && current === guard.text) {
            lastClipboardTextRef.current = current;
            selfCopyGuardRef.current = null;
            onExternalClipboardChange?.();
            return;
          }
          lastClipboardTextRef.current = current;
          await addClip(current);
          onExternalClipboardChange?.();
        }
      } finally {
        ticking = false;
      }
    };

    const startPolling = async () => {
      try {
        const initial = await readClipboard();
        if (initial) {
          lastClipboardTextRef.current = initial;
          primedRef.current = true;
        }
      } catch {}
      interval = setInterval(() => { if (!ticking) void tick(); }, 1500);
    };

    attachBackground();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (unsubscribe) unsubscribe();
      stopped = true;
  document.removeEventListener('copy', copyListener, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps, existingClips]);

  // Expose a guard setter for copy actions
  const markSelfCopy = (text: string) => {
    selfCopyGuardRef.current = { text, expires: Date.now() + 3000 };
    lastClipboardTextRef.current = text;
    suppressNextAddRef.current = Date.now() + guardDurationMs;
  selfInitiatedCopyRef.current = true;
  // Reset flag shortly after allowing external manual copies to be detected
  setTimeout(() => { selfInitiatedCopyRef.current = false; }, 400);
  };

  return { markSelfCopy };
}
