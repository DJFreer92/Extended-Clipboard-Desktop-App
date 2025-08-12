import { useState } from "react";
import { clipService } from "../../services/clipService";

export default function SettingsPage() {
  const [busy, setBusy] = useState(false);

  const onDeleteAll = async () => {
    if (busy) return;
    const ok = window.confirm("Delete ALL clips? This cannot be undone.");
    if (!ok) return;
    setBusy(true);
    try {
      await clipService.deleteAllClips();
      // Nothing else to do here; HomePage maintains its own state and will refresh on next visit or via user action.
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
        title="Delete all clips"
        disabled={busy}
        onClick={() => { void onDeleteAll(); }}
      >
        <span className="icon icon-delete" aria-hidden="true" />
        <span>{busy ? "Deleting…" : "Delete All Clips"}</span>
      </button>
    </section>
  );
}
