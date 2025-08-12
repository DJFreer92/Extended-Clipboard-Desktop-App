import { Fragment, useMemo, useState, useRef, useEffect, useLayoutEffect } from "react";
import { ClipModel } from "../../models/clip";

type ClipGroup = {
  key: string;
  label: string;
  items: Array<{ clip: ClipModel; index: number }>;
};

type Props = {
  clips: ClipModel[];
  onCopy: (clip: ClipModel, index: number) => void;
  onDelete: (id: number) => void; // delete by id to avoid index mismatch under filtering
  isSearching?: boolean;
};

function formatTimeAMPM(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

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
  // Minimum width for a column (should match minmax in CSS)
  const MIN_COL_WIDTH = 350;
  // Horizontal padding of .app-main (clamp(16px, 4vw, 28px) each side)
  function getHorizontalPadding() {
    // Try to get computed style from .app-main
    const main = document.querySelector('.app-main');
    if (main) {
      const style = window.getComputedStyle(main);
      // parseFloat handles px or computed values
      return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    }
    // Fallback: assume max clamp value (28px each side)
    return 56;
  }

  const [numCols, setNumCols] = useState(1);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Update number of columns on resize
  useLayoutEffect(() => {
    function updateCols() {
      if (!listRef.current) return;
      // The parent of .clip-list is likely .app-main
      const container = listRef.current.parentElement;
      if (!container) return;
      const totalPadding = getHorizontalPadding();
      const availableWidth = container.clientWidth - totalPadding;
      const cols = Math.max(1, Math.floor(availableWidth / MIN_COL_WIDTH));
      setNumCols(cols);
    }
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);
  // Modal state for viewing full content
  const [openClip, setOpenClip] = useState<ClipModel | null>(null);
  const closeModal = () => setOpenClip(null);
  const hasClips = !!(clips && clips.length);


  // Group clips by date
  const groups = useMemo(() => {
    const map = new Map<string, ClipGroup>();
    clips.forEach((clip, idx) => {
      const d = toDate(clip.Timestamp);
      const key = dateKey(d);
      if (!map.has(key)) {
        map.set(key, { key, label: formatRelative(d), items: [] });
      }
      map.get(key)!.items.push({ clip, index: idx });
    });
    return Array.from(map.values());
  }, [clips]);

  // Collapsed state for groups
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({});
  const toggleGroup = (key: string) => setCollapsed(c => ({ ...c, [key]: !c[key] }));

  return (
    <Fragment>
      {!hasClips ? (
        <div className="empty-state" role="status" aria-live="polite">
          <p>{isSearching ? "No results" : "No clips yet"}</p>
          {!isSearching && <small>Copy something to see it here.</small>}
        </div>
      ) : (
        <ul
          className="clip-list"
          role="list"
          ref={listRef}
          style={{ gridTemplateColumns: `repeat(${numCols}, 1fr)` }}
        >
          {groups.map(g => (
            <Fragment key={g.key}>
              <li
                className={`date-separator${collapsed[g.key] ? ' is-collapsed' : ''}`}
                aria-label={`${g.label} (${g.items.length})`}
                style={{ gridColumn: '1 / -1' }}
              >
                <button
                  type="button"
                  className="group-toggle"
                  aria-expanded={!collapsed[g.key]}
                  onClick={() => toggleGroup(g.key)}
                >
                  <span className={`chevron${collapsed[g.key] ? ' collapsed' : ''}`} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                  <span className="group-label">{g.label} </span>
                  <span className="group-count"> ({g.items.length} {g.items.length === 1 ? 'item' : 'items'})</span>
                </button>
              </li>
              {!collapsed[g.key] && g.items.map(({ clip, index }) => (
                <li
                  key={clip.Id}
                  className="clip-item"
                  role="listitem"
                  data-time={formatTimeAMPM(toDate(clip.Timestamp))}
                  onClick={() => setOpenClip(clip)}
                >
                  <div className="clip-text">{clip.Content}</div>
                  <button
                    type="button"
                    className="icon-button copy-btn"
                    aria-label="Copy clip"
                    title="Copy to clipboard"
                    onClick={e => { e.stopPropagation(); onCopy(clip, index); }}
                  >
                    <span className="icon icon-copy" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button delete-btn"
                    aria-label="Delete clip"
                    title="Delete clip"
                    onClick={e => { e.stopPropagation(); onDelete(clip.Id); }}
                  >
                    <span className="icon icon-delete" aria-hidden="true" />
                  </button>
                </li>
              ))}
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
          <div className="modal" onClick={e => e.stopPropagation()}>
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
