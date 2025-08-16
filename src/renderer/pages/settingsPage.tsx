import { useEffect, useState } from "react";
import { clipsService } from "../../services/clips/clipsService";
import { useSettings, DeleteAllButton } from "../features";

export default function SettingsPage() {
  const [hasHistory, setHasHistory] = useState<boolean>(true);
  const { busy, deleteAllClips } = useSettings();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cnt = await clipsService.getNumClips();
        if (!cancelled) setHasHistory(cnt > 0);
      } catch {
        // Leave as true on error so the button isn't permanently disabled if API hiccups
        if (!cancelled) setHasHistory(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDeleteAll = async (): Promise<boolean> => {
    const success = await deleteAllClips();
    if (success) {
      setHasHistory(false);
    }
    return success;
  };

  return (
    <section className="settings-page">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>Data Management</h3>
        <div className="settings-item">
          <div className="settings-label">
            <h4>Delete Clipboard History</h4>
            <p>Permanently delete all saved clipboard items. This action cannot be undone.</p>
          </div>
          <DeleteAllButton
            onDelete={handleDeleteAll}
            busy={busy}
            hasHistory={hasHistory}
          />
        </div>
      </div>
    </section>
  );
}
