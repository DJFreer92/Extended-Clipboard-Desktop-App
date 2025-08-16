import { useState } from "react";
import { clipsService } from "../../../../services/clips/clipsService";

export function useSettings() {
  const [busy, setBusy] = useState(false);

  const deleteAllClips = async (): Promise<boolean> => {
    if (busy) return false;

    const ok = window.confirm(
      "Are you sure you want to delete your entire clipboard history? This cannot be undone."
    );
    if (!ok) return false;

    setBusy(true);
    try {
      await clipsService.deleteAllClips();

      // Emit custom event to notify other components that clips were deleted
      window.dispatchEvent(new CustomEvent('clipsDeleted'));

      return true;
    } catch (e) {
      console.error("Failed to delete all clips", e);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    deleteAllClips,
  };
}
