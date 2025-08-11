import { Fragment, useMemo, useState } from "react";
import { ClipModel } from "../../models/clip";

type Props = {
  clips: ClipModel[];
  onCopy: (clip: ClipModel, index: number) => void;
  onDelete: (id: number) => void; // delete by id to avoid index mismatch under filtering
  isSearching?: boolean;
};

function toDate(d: Date | number | string): Date {
  return d instanceof Date ? d : new Date(d);
}

function dateKey(d: Date): string {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].join("-");
}

function formatRelative(d: Date): string {
  const now = new Date();
  const ms = now.getTime() - d.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years >= 1) return `${years} ${years === 1 ? "year" : "years"} ago`;
  if (months >= 12) return `1 year ago`;
  if (months >= 1) return `${months} ${months === 1 ? "month" : "months"} ago`;
  if (weeks >= 1) return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

function formatFullDate(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default function ClipList({ clips, onCopy, onDelete, isSearching }: Props) {
  // Modal state for viewing full content
  const [openClip, setOpenClip] = useState<ClipModel | null>(null);
  const closeModal = () => setOpenClip(null);
  const hasClips = !!(clips && clips.length);

  // Group clips by calendar date
  const groups = useMemo(() => {
  const acc: Array<{ key: string; label: string; items: Array<{ clip: ClipModel; index: number }> }> = [];
    let currentKey = "";
    clips.forEach((clip, index) => {
  const d = toDate(clip.Timestamp);
      const k = dateKey(d);
      if (k !== currentKey) {
        currentKey = k;
        const label = `${formatRelative(d)} | ${formatFullDate(d)}`;
        acc.push({ key: k, label, items: [] });
      }
      acc[acc.length - 1].items.push({ clip, index });
    });
    return acc;
  }, [clips]);

  // Collapsed state per group key
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <Fragment>
    {!hasClips ? (
      <div className="empty-state" role="status" aria-live="polite">
        <p>{isSearching ? "No results" : "No clips yet"}</p>
        {!isSearching && <small>Copy something to see it here.</small>}
      </div>
    ) : (
      <ul className="clip-list" role="list">
      {groups.map((g) => (
        <Fragment key={`grp-${g.key}`}>
      <li key={`sep-${g.key}`} className={`date-separator ${collapsed[g.key] ? "is-collapsed" : ""}`} aria-label={`${g.label} (${g.items.length})`}>
            <button
              type="button"
              className="group-toggle"
              aria-expanded={!collapsed[g.key]}
              onClick={() => toggleGroup(g.key)}
            >
              <span className={`chevron ${collapsed[g.key] ? "collapsed" : ""}`} aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
              <span className="group-label">{g.label} </span>
              <span className="group-count"> ({g.items.length} {g.items.length === 1 ? 'item' : 'items'})</span>
            </button>
          </li>
          {!collapsed[g.key] && (
            g.items.map(({ clip, index }) => (
              <li
                key={index}
                className="clip-item"
                role="listitem"
                onClick={() => setOpenClip(clip)}
              >
                <div className="clip-text">{clip.Content}</div>
                <button
                  type="button"
                  className="icon-button copy-btn"
                  aria-label="Copy clip"
                  title="Copy to clipboard"
                  onClick={(e) => { e.stopPropagation(); onCopy(clip, index); }}
                >
                  <span className="icon icon-copy" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button delete-btn"
                  aria-label="Delete clip"
                  title="Delete clip"
                  onClick={(e) => { e.stopPropagation(); onDelete(clip.Id); }}
                >
                  <span className="icon icon-delete" aria-hidden="true" />
                </button>
              </li>
            ))
          )}
        </Fragment>
      ))}
      </ul>
    )}
    {/* Modal for viewing full clip content */}
    {openClip && (
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        onClick={closeModal}
      >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">
              Clip
              {(() => {
                const d = toDate(openClip.Timestamp);
                const label = `${formatRelative(d)} | ${formatFullDate(d)}`;
                return <span style={{ marginLeft: 8, color: 'var(--muted)', fontWeight: 400 }}>({label})</span>;
              })()}
            </h3>
            <button
              type="button"
              className="icon-button close-btn"
              aria-label="Close"
              title="Close"
              onClick={closeModal}
            >
              <span className="icon icon-close" aria-hidden="true" />
            </button>
          </div>
          <div className="modal-body">
            {openClip.Content}
          </div>
        </div>
      </div>
    )}
  </Fragment>
  );
}
