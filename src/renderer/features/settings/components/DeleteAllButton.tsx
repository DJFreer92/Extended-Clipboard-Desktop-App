import React from "react";

interface DeleteAllButtonProps {
  onDelete: () => Promise<boolean>;
  busy: boolean;
  hasHistory: boolean;
}

export default function DeleteAllButton({ onDelete, busy, hasHistory }: DeleteAllButtonProps) {
  const handleClick = async () => {
    const success = await onDelete();
    if (success) {
      // Could show success message here
    }
  };

  return (
    <button
      type="button"
      className="icon-button delete-btn delete-all-btn"
      aria-label="Delete all clips"
      title="Delete clipboard history"
      disabled={busy || !hasHistory}
      onClick={handleClick}
    >
      <span className="icon icon-delete" aria-hidden="true" />
      <span>{busy ? "Deleting..." : "Delete Clipboard History"}</span>
      {busy && (
        <span className="icon icon-spinner spinner-inline" aria-label="Deleting" />
      )}
    </button>
  );
}
