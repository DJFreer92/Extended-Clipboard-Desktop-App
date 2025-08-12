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
  onDelete: (id: number) => void;
  onToggleFavorite?: (clip: ClipModel) => void;
  isSearching?: boolean;
  onTagAdded?: (tag: string) => void;
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

export default function ClipList({ clips, onCopy, onDelete, onToggleFavorite, isSearching, onTagAdded }: Props) {
  const MIN_COL_WIDTH = 350;
  const [numCols, setNumCols] = useState(1);
  const listRef = useRef<HTMLUListElement | null>(null);
  function getHorizontalPadding(): number {
    if (!listRef.current?.parentElement) return 0;
    const style = window.getComputedStyle(listRef.current.parentElement);
    const pl = parseFloat(style.paddingLeft || '0');
    const pr = parseFloat(style.paddingRight || '0');
    return pl + pr;
  }
  useLayoutEffect(() => {
    function updateCols() {
      if (!listRef.current) return;
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

  const [openClip, setOpenClip] = useState<ClipModel | null>(null);
  const closeModal = () => setOpenClip(null);
  const hasClips = clips && clips.length > 0;

  const groups = useMemo<ClipGroup[]>(() => {
    const map = new Map<string, ClipGroup>();
    clips.forEach((clip, idx) => {
      const d = toDate(clip.Timestamp);
      const key = dateKey(d);
      if (!map.has(key)) {
        map.set(key, { key, label: formatRelative(d), items: [] });
      }
      map.get(key)!.items.push({ clip, index: idx });
    });
    return Array.from(map.values()).sort((a, b) => {
      const [ay, am, ad] = a.key.split('-').map(Number);
      const [by, bm, bd] = b.key.split('-').map(Number);
      return new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime();
    });
  }, [clips]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string) => setCollapsed(c => ({ ...c, [key]: !c[key] }));
  const [expandedBadges, setExpandedBadges] = useState<Set<number>>(() => new Set());
  const expandBadges = (id: number) => setExpandedBadges(prev => new Set(prev).add(id));
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedShake, setCopiedShake] = useState(0);
  const [modalShakeSkip, setModalShakeSkip] = useState(true);
  const [copyAnimActive, setCopyAnimActive] = useState(false);
  const animTimerRef = useRef<number | null>(null);
  useEffect(() => { return () => { if (animTimerRef.current) window.clearTimeout(animTimerRef.current); }; }, []);
  useEffect(() => { setCopiedId(null); setCopiedShake(0); }, [clips]);
  useEffect(() => { if (openClip) setModalShakeSkip(true); }, [openClip?.Id]);
  const [tagIdMap, setTagIdMap] = useState<Record<string, number>>({});
  const [, forceRender] = useState(0);
  async function getTagId(tagName: string): Promise<number | undefined> {
    if (tagIdMap[tagName] != null) return tagIdMap[tagName];
    try {
      const svc = (await import('../../services/clipService')).clipService;
      const tags = await svc.getAllTags();
      const map: Record<string, number> = {};
      tags.forEach(t => { map[t.name] = t.id; });
      setTagIdMap(map);
      return map[tagName];
    } catch (e) {
      console.error('Failed to load tags list', e);
      return undefined;
    }
  }
  async function resolveTagIdWithRetry(tagName: string, retries = 2, delayMs = 220): Promise<number | undefined> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const id = await getTagId(tagName);
      if (id != null) return id;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs));
        setTagIdMap(m => { const { [tagName]: _omit, ...rest } = m; return rest; });
      }
    }
    return undefined;
  }
  async function handleRemoveTag(clip: ClipModel, tagName: string) {
    if (!clip.Tags || !clip.Tags.includes(tagName)) return;
    const updatedTags = clip.Tags.filter(t => t !== tagName);
    Object.assign(clip, { Tags: updatedTags });
    forceRender(x => x + 1);
    setOpenClip(c => c && c.Id === clip.Id ? { ...c, Tags: updatedTags } : c);
    try {
      const id = await resolveTagIdWithRetry(tagName);
      if (id == null) { console.warn('Tag id not found; skipping API call for removal of', tagName); return; }
      const svc = (await import('../../services/clipService')).clipService;
      await svc.removeClipTag(clip.Id, id);
    } catch (e) { console.error('Failed to remove tag', e); }
  }
  const triggerCopy = (clip: ClipModel, index: number) => {
    onCopy(clip, index);
    setCopiedId(clip.Id);
    setCopiedShake(s => s + 1);
    setCopyAnimActive(true);
    if (animTimerRef.current) window.clearTimeout(animTimerRef.current);
    animTimerRef.current = window.setTimeout(() => setCopyAnimActive(false), 520);
  };
  function handleTagAdded(clip: ClipModel, name?: string) {
    if (name) {
      if (!clip.Tags) clip.Tags = [];
      if (!clip.Tags.includes(name)) {
        clip.Tags = [...clip.Tags, name];
        forceRender(x => x + 1);
      }
      onTagAdded?.(name);
    }
  }
  return (
    <Fragment>
      {!hasClips ? (
        <div className="empty-state" role="status" aria-live="polite">
          <p>{isSearching ? 'No results' : 'No clips yet'}</p>
          {!isSearching && <small>Copy something to see it here.</small>}
        </div>
      ) : (
        <ul className="clip-list" role="list" ref={listRef} style={{ gridTemplateColumns: `repeat(${numCols}, 1fr)` }}>
          {groups.map(g => (
            <Fragment key={g.key}>
              <li className={`date-separator${collapsed[g.key] ? ' is-collapsed' : ''}`} aria-label={`${g.label} (${g.items.length})`} style={{ gridColumn: '1 / -1' }}>
                <button type="button" className="group-toggle" aria-expanded={!collapsed[g.key]} onClick={() => toggleGroup(g.key)}>
                  <span className={`chevron${collapsed[g.key] ? ' collapsed' : ''}`} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                  <span className="group-label">{g.label} </span>
                  <span className="group-count"> ({g.items.length} {g.items.length === 1 ? 'item' : 'items'})</span>
                </button>
              </li>
              {!collapsed[g.key] && g.items.map(({ clip, index }) => {
                const isFav = !!clip.IsFavorite;
                const THRESHOLD = 140;
                const CHAR_PX = 6;
                const BASE_BADGE = 20;
                let used = 0;
                const limitedTags: string[] = [];
                if (clip.FromAppName) used += BASE_BADGE + clip.FromAppName.length * CHAR_PX;
                if (clip.Tags && clip.Tags.length) {
                  if (expandedBadges.has(clip.Id)) {
                    limitedTags.push(...clip.Tags);
                  } else {
                    for (const t of clip.Tags) {
                      const w = BASE_BADGE + t.length * CHAR_PX;
                      if (used + w > THRESHOLD) { limitedTags.push('…'); break; }
                      limitedTags.push(t);
                      used += w;
                    }
                  }
                }
                const showTags = limitedTags;
                return (
                  <li key={clip.Id} className={`clip-item${isFav ? ' is-favorite' : ''}`} role="listitem" data-time={formatTimeAMPM(toDate(clip.Timestamp))} onClick={() => triggerCopy(clip, index)} title="Click to copy">
                    <button type="button" className={`favorite-btn${isFav ? ' active' : ''}`} aria-label={isFav ? 'Unfavorite clip' : 'Favorite clip'} title={isFav ? 'Unfavorite' : 'Favorite'} onClick={e => { e.stopPropagation(); onToggleFavorite?.(clip); setOpenClip(c => c && c.Id === clip.Id ? { ...c, IsFavorite: !c.IsFavorite } : c); }}>
                      <span className={'icon icon-star_filled'} style={{ background: isFav ? '#facc15' : '#4a4f58' }} aria-hidden="true" />
                    </button>
                    <div className="clip-text">{clip.Content.trim()}</div>
                    <div className="clip-right-meta">
                      {copiedId === clip.Id && (
                        <span key={`copied_${clip.Id}_${copiedShake}`} className={`copied-indicator${copyAnimActive ? ' shaking' : ''}`}>Copied!</span>
                      )}
                      {clip.FromAppName && (<span className="badge badge-app" title={clip.FromAppName}>{clip.FromAppName}</span>)}
                      {showTags.map(t => t === '…'
                        ? (expandedBadges.has(clip.Id) ? null : (
                          <button key={'ellipsis_' + clip.Id} type="button" className="badge badge-tag badge-ellipsis" title="Show all tags" onClick={e => { e.stopPropagation(); expandBadges(clip.Id); }}>…</button>
                        ))
                        : (
                          <span key={t + '_tag'} className="badge badge-tag tag-removable" title={t} onClick={e => e.stopPropagation()}>
                            {t}
                            <button type="button" className="tag-remove-btn" aria-label={`Remove tag ${t}`} title="Remove tag" onClick={e => { e.stopPropagation(); handleRemoveTag(clip, t); }}>
                              <span className="icon icon-remove" aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                      <TagAddControl clip={clip} onAdded={(name) => handleTagAdded(clip, name)} />
                      <button type="button" className="expand-btn" aria-label="Expand clip" title="Expand clip" onClick={e => { e.stopPropagation(); setOpenClip(clip); }}>
                        <span className="icon icon-expand" aria-hidden="true" />
                      </button>
                      <button type="button" className="floating-delete-btn" aria-label="Delete clip" title="Delete clip" onClick={e => { e.stopPropagation(); onDelete(clip.Id); }}>
                        <span className="icon icon-delete" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </Fragment>
          ))}
        </ul>
      )}
      {openClip && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ position: 'relative' }}>
              {onToggleFavorite && (
                <button type="button" className={`favorite-btn modal-fav-btn${openClip.IsFavorite ? ' active' : ''}`} aria-label={openClip.IsFavorite ? 'Unfavorite clip' : 'Favorite clip'} title={openClip.IsFavorite ? 'Unfavorite' : 'Favorite'} onClick={e => { e.stopPropagation(); onToggleFavorite(openClip); setOpenClip({ ...openClip, IsFavorite: !openClip.IsFavorite }); }} style={{ opacity: 1 }}>
                  <span className={'icon icon-star_filled'} style={{ background: openClip.IsFavorite ? '#facc15' : '#4a4f58', width: 26, height: 26 }} aria-hidden="true" />
                </button>
              )}
              <h3 className="modal-title">Clip
                {(() => {
                  const d = toDate(openClip.Timestamp);
                  const label = `${formatRelative(d)} | ${formatFullDate(d)} | ${formatTimeAMPM(d)}`;
                  return (
                    <span style={{ marginLeft: 8, color: 'var(--muted)', fontWeight: 400, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      ({label})
                      {copiedId === openClip.Id && (
                        <span key={`copied_modal_${openClip.Id}_${copiedShake}_${modalShakeSkip ? 'skip' : 'anim'}`} className={`copied-indicator${(!modalShakeSkip && copyAnimActive) ? ' shaking' : ''}`} style={{ marginLeft: 4 }}>Copied!</span>
                      )}
                    </span>
                  );
                })()}
              </h3>
              <div className="modal-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end', marginRight: 48 }}>
                {openClip.FromAppName && <span className="badge badge-app" title={openClip.FromAppName}>{openClip.FromAppName}</span>}
                {openClip.Tags && openClip.Tags.map(t => (
                  <span key={t + '_modal'} className="badge badge-tag tag-removable" title={t} onClick={e => e.stopPropagation()}>
                    {t}
                    <button type="button" className="tag-remove-btn" aria-label={`Remove tag ${t}`} title="Remove tag" onClick={e => { e.stopPropagation(); handleRemoveTag(openClip, t); }}>
                      <span className="icon icon-remove" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <TagAddControl clip={openClip} onAdded={(name) => { if (name) { setOpenClip(c => c ? { ...c, Tags: c.Tags && !c.Tags.includes(name) ? [...c.Tags, name] : (c.Tags || [name]) } : c); onTagAdded?.(name); } }} alwaysVisible />
              </div>
              <button type="button" className="icon-button close-btn" aria-label="Close" title="Close" onClick={closeModal} style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)' }}>
                <span className="icon icon-close" aria-hidden="true" />
              </button>
            </div>
            <div className="modal-body with-actions">
              <div className="modal-content">{openClip.Content.trim()}</div>
              <div className="modal-actions right">
                <button type="button" className="icon-button copy-btn" aria-label="Copy clip" title="Copy clip" onClick={() => { const idx = clips.findIndex(c => c.Id === openClip.Id); triggerCopy(openClip, idx === -1 ? 0 : idx); setModalShakeSkip(false); }}>
                  <span className="icon icon-copy" aria-hidden="true" />
                </button>
                <button type="button" className="icon-button delete-btn" aria-label="Delete clip" title="Delete clip" onClick={() => { onDelete(openClip.Id); closeModal(); }}>
                  <span className="icon icon-delete" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}

function TagAddControl({ clip, onAdded, alwaysVisible }: { clip: ClipModel; onAdded: (name?: string) => void; alwaysVisible?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);
  const commit = async () => {
    const name = value.trim();
    setEditing(false);
    if (!name) { setValue(""); return; }
    if (clip.Tags && clip.Tags.includes(name)) { setValue(""); return; }
    try {
      (await import('../../services/clipService')).clipService.addClipTag(clip.Id, name);
      onAdded(name);
    } catch (e) { console.error('Failed to add tag', e); }
    setValue("");
  };
  if (editing) {
    return (
      <input ref={inputRef} type="text" className="badge badge-tag badge-tag-input" value={value} placeholder={"tag"} onClick={e => e.stopPropagation()} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } else if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setValue(""); } }} onBlur={() => commit()} aria-label="New tag name" />
    );
  }
  return (
    <button type="button" className={`badge badge-tag badge-add${alwaysVisible ? ' always' : ''}`} title="Add tag" onClick={e => { e.stopPropagation(); setEditing(true); }} aria-label="Add tag">
      <span className="icon icon-add" aria-hidden="true" />
    </button>
  );
}

// Inline component for tag adding (badge morph -> input)
