import { useEffect, useState } from "react";
import { clipService } from "../../services/clipService";

export default function SettingsPage() {
  const [busy, setBusy] = useState(false);
  const [hasHistory, setHasHistory] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cnt = await clipService.getNumClips();
        if (!cancelled) setHasHistory(cnt > 0);
      } catch {
        // Leave as true on error so the button isn't permanently disabled if API hiccups
        if (!cancelled) setHasHistory(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onDeleteAll = async () => {
    if (busy) return;
    const ok = window.confirm("Are you sure you want to delete your entire clipboard history? This cannot be undone.");
    if (!ok) return;
    setBusy(true);
    try {
      await clipService.deleteAllClips();
      // Nothing else to do here; HomePage maintains its own state and will refresh on next visit or via user action.
      setHasHistory(false);
    } catch (e) {
      console.error("Failed to delete all clips", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="settings-page">
      <h2>Settings</h2>
      <button
        type="button"
        className="icon-button delete-btn delete-all-btn"
        aria-label="Delete all clips"
        title="Delete clipboard history"
        disabled={busy || !hasHistory}
        onClick={() => { void onDeleteAll(); }}
      >
        <span className="icon icon-delete" aria-hidden="true" />
        <span>{busy ? "Deleting..." : "Delete Clipboard History"}</span>
        {busy && (
          <span className="icon icon-spinner spinner-inline" aria-label="Deleting" />
        )}
      </button>
    </section>
  );
}
