import { Fragment, useMemo, useState, useRef, useEffect, useLayoutEffect } from "react";
import { ClipModel } from "../../models/clip";
import { toDate, dateKey, formatRelative, formatTimeAMPM, formatFullDate } from "../utils/date";

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
  externalClipboardNonce?: number; // increments when system clipboard changes externally
};

// Date/time helpers now imported from utils/date

export default function ClipList({ clips, onCopy, onDelete, onToggleFavorite, isSearching, onTagAdded, externalClipboardNonce }: Props) {
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
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const toggleGroup = (key: string) => setCollapsed(c => ({ ...c, [key]: !c[key] }));

  const handleDeleteGroup = (group: ClipGroup) => {
    const clipIds = group.items.map(item => item.clip.Id);
    // Delete each clip sequentially
    clipIds.forEach(id => onDelete(id));
  };
  const [expandedBadges, setExpandedBadges] = useState<Set<number>>(() => new Set());
  const expandBadges = (id: number) => setExpandedBadges(prev => new Set(prev).add(id));
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedShake, setCopiedShake] = useState(0);
  const [modalShakeSkip, setModalShakeSkip] = useState(true);
  const [copyAnimActive, setCopyAnimActive] = useState(false);
  const animTimerRef = useRef<number | null>(null);
  useEffect(() => { return () => { if (animTimerRef.current) window.clearTimeout(animTimerRef.current); }; }, []);
  // Preserve copied indicator across lightweight mutations (e.g., favorite toggles) while
  // clearing it only if the copied clip disappears from the list (deleted, filtered out) or
  // the list is structurally replaced (IDs set changes so copied item is absent).
  useEffect(() => {
    if (copiedId == null) return; // nothing to do
    const stillExists = clips.some(c => c.Id === copiedId);
    if (!stillExists) {
      setCopiedId(null);
      setCopiedShake(0);
    }
  }, [clips, copiedId]);
  useEffect(() => { if (openClip) setModalShakeSkip(true); }, [openClip?.Id]);
  // Hide copied indicator when system clipboard changes externally
  useEffect(() => {
    if (externalClipboardNonce != null) {
      setCopiedId(null);
      setCopiedShake(0);
    }
  }, [externalClipboardNonce]);
  const [tagIdMap, setTagIdMap] = useState<Record<string, number>>({});
  const [, forceRender] = useState(0);
  async function getTagId(tagName: string): Promise<number | undefined> {
    if (tagIdMap[tagName] != null) return tagIdMap[tagName];
    try {
      const svc = (await import('../../services/tags/tagsService')).tagsService;
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
      const svc = (await import('../../services/tags/tagsService')).tagsService;
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
      // Find the actual clip in the clips array to ensure we're working with the current state
      const actualClip = clips.find(c => c.Id === clip.Id);
      if (actualClip) {
        if (!actualClip.Tags) actualClip.Tags = [];
        if (!actualClip.Tags.includes(name)) {
          actualClip.Tags = [...actualClip.Tags, name];
          forceRender(x => x + 1);
          // Also update the modal state if the modal is open for this clip
          setOpenClip(c => c && c.Id === clip.Id ? { ...c, Tags: [...(actualClip.Tags)] } : c);
        }
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
              <li
                className={`date-separator${collapsed[g.key] ? ' is-collapsed' : ''}${hoveredSection === g.key ? ' is-hovered' : ''}`}
                aria-label={`${g.label} (${g.items.length})`}
                style={{ gridColumn: '1 / -1' }}
                onMouseEnter={() => setHoveredSection(g.key)}
                onMouseLeave={() => setHoveredSection(null)}
              >
                <div
                  className="date-separator-content"
                  onClick={() => toggleGroup(g.key)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="group-toggle" aria-expanded={!collapsed[g.key]}>
                    <span className={`chevron${collapsed[g.key] ? ' collapsed' : ''}`} aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                    <span className="group-label">{g.label} </span>
                    <span className="group-count"> ({g.items.length} {g.items.length === 1 ? 'item' : 'items'})</span>
                  </div>
                  <button
                    type="button"
                    className="section-delete-btn"
                    aria-label={`Delete all ${g.items.length} clips from ${g.label}`}
                    title={`Delete all ${g.items.length} clips from ${g.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(g);
                    }}
                  >
                    <span className="icon icon-delete" aria-hidden="true" />
                  </button>
                </div>
              </li>
              {!collapsed[g.key] && g.items.map(({ clip, index }) => {
                const isFav = !!clip.IsFavorite;
                const isExpanded = expandedBadges.has(clip.Id);
                const THRESHOLD = 140;
                const CHAR_PX = 6;
                const BASE_BADGE = 20;
                let used = 0;
                const limitedTags: string[] = [];
                if (clip.FromAppName) used += BASE_BADGE + (clip.FromAppName?.length || 0) * CHAR_PX;
                if (clip.Tags && clip.Tags.length) {
                  if (isExpanded) {
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
                  <li
                    key={clip.Id}
                    className={`clip-item${isFav ? ' is-favorite' : ''}${isExpanded ? ' is-tags-expanded' : ''}`}
                    role="listitem"
                    data-time={formatTimeAMPM(toDate(clip.Timestamp))}
                    onClick={(e) => {
                      // Ignore clicks originating from interactive controls
                      const target = e.target as HTMLElement;
                      if (target.closest('button')) return;
                      triggerCopy(clip, index);
                    }}
                  >
                    <button type="button" className={`favorite-btn${isFav ? ' active' : ''}`} aria-label={isFav ? 'Unfavorite clip' : 'Favorite clip'} title={isFav ? 'Unfavorite' : 'Favorite'} onClick={e => { e.stopPropagation(); setOpenClip(c => c && c.Id === clip.Id ? { ...c, IsFavorite: !c.IsFavorite } : c); onToggleFavorite?.({ ...clip, IsFavorite: !clip.IsFavorite }); }}>
                      <span className={'icon icon-star_filled'} style={{ background: isFav ? '#facc15' : '#4a4f58' }} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="clip-text clip-copy-btn"
                      onClick={() => triggerCopy(clip, index)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); triggerCopy(clip, index); } }}
                      title="Click to copy"
                      aria-label="Copy clip"
                    >
                      {clip.Content.trim()}
                    </button>
                    <div className="clip-right-meta">
                      {copiedId === clip.Id && (
                        <span key={`copied_${clip.Id}_${copiedShake}`} className={`copied-indicator${copyAnimActive ? ' shaking' : ''}`}>Copied!</span>
                      )}
                      {/* In collapsed mode show badges inline to save space */}
                      {!isExpanded && clip.FromAppName && (<span className="badge badge-app" title={clip.FromAppName}>{clip.FromAppName}</span>)}
                      {!isExpanded && showTags.map(t => t === '…'
                        ? (
                          <button key={'ellipsis_' + clip.Id} type="button" className="badge badge-tag badge-ellipsis" title="Show all tags" onClick={e => { e.stopPropagation(); expandBadges(clip.Id); }}>…</button>
                        )
                        : (
                          <span key={t + '_tag'} className="badge badge-tag tag-removable" title={t} onClick={e => e.stopPropagation()}>
                            {t}
                            <button type="button" className="tag-remove-btn" aria-label={`Remove tag ${t}`} title="Remove tag" onClick={e => { e.stopPropagation(); handleRemoveTag(clip, t); }}>
                              <span className="icon icon-remove" aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                      {!isExpanded && <TagAddControl clip={clip} onAdded={(name) => handleTagAdded(clip, name)} />}
                      <button type="button" className="expand-btn" aria-label="Expand clip" title="Expand clip" onClick={e => { e.stopPropagation(); setOpenClip(clip); }}>
                        <span className="icon icon-expand" aria-hidden="true" />
                      </button>
                      <button type="button" className="floating-delete-btn" aria-label="Delete clip" title="Delete clip" onClick={e => { e.stopPropagation(); onDelete(clip.Id); }}>
                        <span className="icon icon-delete" aria-hidden="true" />
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="clip-tags-row">
                        {clip.FromAppName && (<span className="badge badge-app" title={clip.FromAppName}>{clip.FromAppName}</span>)}
                        {clip.Tags && clip.Tags.map(t => (
                          <span key={t + '_row'} className="badge badge-tag tag-removable" title={t} onClick={e => e.stopPropagation()}>
                            {t}
                            <button type="button" className="tag-remove-btn" aria-label={`Remove tag ${t}`} title="Remove tag" onClick={e => { e.stopPropagation(); handleRemoveTag(clip, t); }}>
                              <span className="icon icon-remove" aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                        <TagAddControl clip={clip} onAdded={(name) => handleTagAdded(clip, name)} />
                      </div>
                    )}
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
            <div className="modal-header modal-header-stacked" style={{ position: 'relative' }}>
              <div className="modal-header-top">
                {onToggleFavorite && (
                    <button
                      type="button"
                      className={`favorite-btn modal-fav-btn${openClip.IsFavorite ? ' active' : ''}`}
                      aria-label={openClip.IsFavorite ? 'Unfavorite clip' : 'Favorite clip'}
                      title={openClip.IsFavorite ? 'Unfavorite' : 'Favorite'}
                      onClick={e => {
                        e.stopPropagation();
                        setOpenClip(c => c ? { ...c, IsFavorite: !c.IsFavorite } : c);
                        onToggleFavorite({ ...openClip, IsFavorite: !openClip.IsFavorite });
                      }}
                      style={{ opacity: 1 }}
                      onMouseEnter={e => {
                        const icon = e.currentTarget.querySelector('.icon-star_filled');
                        if (icon && !openClip.IsFavorite) icon.setAttribute('style', 'background: #fff; width: 26px; height: 26px');
                      }}
                      onMouseLeave={e => {
                        const icon = e.currentTarget.querySelector('.icon-star_filled');
                        if (icon && !openClip.IsFavorite) icon.setAttribute('style', 'background: #4a4f58; width: 26px; height: 26px');
                      }}
                    >
                      <span
                        className={'icon icon-star_filled'}
                        style={{
                          background: openClip.IsFavorite ? '#facc15' : '#4a4f58',
                          width: 26,
                          height: 26
                        }}
                        aria-hidden="true"
                      />
                    </button>
                )}
                <h3 className="modal-title">Clip
                  {(() => {
                    const d = toDate(openClip.Timestamp);
                    const label = `${formatRelative(d)} | ${formatFullDate(d)} | ${formatTimeAMPM(d)}`;
                    return (
                      <span className="modal-date-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        ({label})
                        <button type="button" className="icon-button copy-btn inline" aria-label="Copy clip" title="Copy clip" onClick={() => { const idx = clips.findIndex(c => c.Id === openClip.Id); triggerCopy(openClip, idx === -1 ? 0 : idx); setModalShakeSkip(false); }}>
                          <span className="icon icon-copy" aria-hidden="true" />
                        </button>
                        {copiedId === openClip.Id && (
                          <span key={`copied_modal_${openClip.Id}_${copiedShake}_${modalShakeSkip ? 'skip' : 'anim'}`} className={`copied-indicator${(!modalShakeSkip && copyAnimActive) ? ' shaking' : ''}`}>Copied!</span>
                        )}
                      </span>
                    );
                  })()}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                  <button type="button" className="icon-button close-btn" aria-label="Close" title="Close" onClick={closeModal}>
                    <span className="icon icon-close" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="modal-tags-row">
                {openClip.FromAppName && <span className="badge badge-app" title={openClip.FromAppName}>{openClip.FromAppName}</span>}
                {openClip.Tags && openClip.Tags.map(t => (
                  <span key={t + '_modal'} className="badge badge-tag tag-removable" title={t} onClick={e => e.stopPropagation()}>
                    {t}
                    <button type="button" className="tag-remove-btn" aria-label={`Remove tag ${t}`} title="Remove tag" onClick={e => { e.stopPropagation(); handleRemoveTag(openClip, t); }}>
                      <span className="icon icon-remove" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <TagAddControl clip={openClip} onAdded={(name) => { if (name) { setOpenClip(c => c ? { ...c, Tags: c.Tags && !c.Tags.includes(name) ? [...c.Tags, name] : (c.Tags || [name]) } : c); handleTagAdded(openClip, name); } }} alwaysVisible />
              </div>
            </div>
            <div className="modal-body with-actions">
              <div className="modal-content" style={{ paddingBottom: 64 }}>
                {openClip.Content.trim()}
              </div>
            </div>
            {/* Floating delete button pinned to modal corner */}
            <button type="button" className="icon-button delete-btn modal-delete-floating" aria-label="Delete clip" title="Delete clip" onClick={() => { onDelete(openClip.Id); closeModal(); }}>
              <span className="icon icon-delete" aria-hidden="true" />
            </button>
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
      (await import('../../services/tags/tagsService')).tagsService.addClipTag(clip.Id, name);
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
