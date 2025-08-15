import React from "react";

interface RefreshButtonProps {
  onRefresh: () => void;
  loading: boolean;
  fetchError?: string | null;
}

export default function RefreshButton({ onRefresh, loading, fetchError }: RefreshButtonProps) {
  return (
    <div className="search-left">
      <button
        type="button"
        className={`icon-button refresh-btn${loading ? " spinning" : ""}`}
        title="Refresh"
        aria-label="Refresh"
        onClick={onRefresh}
        disabled={loading}
      >
        <span className="icon icon-refresh" aria-hidden />
      </button>
      {fetchError && (
        <span className="fetch-error" role="status" aria-live="polite">{fetchError}</span>
      )}
    </div>
  );
}
