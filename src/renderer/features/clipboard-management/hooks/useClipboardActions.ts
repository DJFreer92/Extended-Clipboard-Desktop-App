import { useState } from "react";

interface UseClipboardActionsProps {
  onCopySuccess?: (text: string) => void;
  onCopyError?: (error: Error) => void;
}

export function useClipboardActions({
  onCopySuccess,
  onCopyError,
}: UseClipboardActionsProps = {}) {
  const [globalExternalCopyNonce, setGlobalExternalCopyNonce] = useState(0);

  const handleCopy = async (clip: { Content: string }, _index?: number) => {
    try {
      const text = (clip?.Content ?? "").toString();
      const api = (window as any)?.electronAPI;
      const hasElectronWrite = api && api.clipboard && typeof api.clipboard.writeText === 'function';
      let copied = false;

      // Try Electron clipboard API first
      if (hasElectronWrite) {
        try {
          api.clipboard.writeText(text);
          copied = true;
        } catch {}
      }

      // Fallback to Web Clipboard API
      if (!copied) {
        const webClipboard: any = (navigator as any)?.clipboard;
        if (webClipboard && typeof webClipboard.writeText === 'function') {
          try {
            await webClipboard.writeText(text);
            copied = true;
          } catch {}
        }
      }

      // Legacy fallback: temporary textarea + execCommand
      if (!copied) {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          ta.style.pointerEvents = 'none';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          if (ok) copied = true;
        } catch {}
      }

      if (!copied) {
        throw new Error("No clipboard API available");
      }

      onCopySuccess?.(text);
    } catch (e) {
      console.error("Copy failed", e);
      onCopyError?.(e as Error);
    }
  };

  const markSelfCopy = (text: string) => {
    // This could be used to mark self-copies to avoid re-adding them
    console.debug('Self copy marked:', text.slice(0, 50));
  };

  const onExternalClipboardChange = () => {
    setGlobalExternalCopyNonce(n => n + 1);
  };

  return {
    handleCopy,
    markSelfCopy,
    globalExternalCopyNonce,
    onExternalClipboardChange,
  };
}
