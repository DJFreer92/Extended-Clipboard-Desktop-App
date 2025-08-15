import { useEffect, useMemo, useRef, useState } from "react";
import { ClipModel, fromApi } from "../../models/clip";
import { clipService } from "../../services/clipService";
import ClipList from "../components/ClipList";
import { useClipboardWatcher } from "../hooks/useClipboardWatcher";

type Range = "all" | "24h" | "week" | "month" | "3months" | "year";

export default function HomePage() {
  // Core state
  const [clips, setClips] = useState<ClipModel[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const newestIdRef = useRef<number | undefined>(undefined);
  useEffect(() => { newestIdRef.current = clips[0]?.Id; }, [clips]);
  const [loading, setLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(false); // for filtered count spinner
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const pageSize = 50;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Clipboard watcher hook handles background and polling logic
  const pendingDeletionRef = useRef<Record<number, { clip: ClipModel; index: number }>>({});

  // Search state
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allApps, setAllApps] = useState<string[]>([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showAppMenu, setShowAppMenu] = useState(false);
  const [showTimeMenu, setShowTimeMenu] = useState(false);
  const tagMenuRef = useRef<HTMLDivElement | null>(null);
  const appMenuRef = useRef<HTMLDivElement | null>(null);
  const timeMenuRef = useRef<HTMLDivElement | null>(null);

  const terms = useMemo(() =>
    query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.toLowerCase()),
  [query]);

  // Map UI range to server timeframe
  const timeFrame = useMemo(() => {
    switch (range) {
      case "24h": return "past_24_hours";
      case "week": return "past_week";
      case "month": return "past_month";
      case "3months": return "past_3_months";
      case "year": return "past_year";
      default: return "";
    }
  }, [range]);

  const searchCSV = useMemo(() => terms.join(","), [terms]);

  const isFiltered = terms.length > 0 || range !== "all" || favoritesOnly || selectedTags.length > 0 || selectedApps.length > 0;
  const displayCount = isFiltered ? filteredCount : totalCount;

  // Debounced taxonomy refresh to avoid redundant API calls
  const taxonomyRefreshTimeout = useRef<NodeJS.Timeout | null>(null);
  const taxonomyLastFetched = useRef<number>(0);
  const TAXONOMY_DEBOUNCE_MS = 500;

  const refreshTaxonomy = (immediate = false) => {
    if (immediate) {
      (async () => {
        try {
          const [tagsResp, appsResp] = await Promise.all([
            clipService.getAllTags().catch(() => []),
            clipService.getAllFromApps().catch(() => []),
          ]);
          if (Array.isArray(tagsResp)) setAllTags(tagsResp.map((t: any) => t.name ?? t));
          if (Array.isArray(appsResp)) setAllApps(appsResp.filter(Boolean).sort());
        } catch {}
      })();
      return;
    }
    if (taxonomyRefreshTimeout.current) clearTimeout(taxonomyRefreshTimeout.current);
    taxonomyRefreshTimeout.current = setTimeout(async () => {
      const now = Date.now();
      if (now - taxonomyLastFetched.current < TAXONOMY_DEBOUNCE_MS) return;
      taxonomyLastFetched.current = now;
      try {
        const [tagsResp, appsResp] = await Promise.all([
          clipService.getAllTags().catch(() => []),
          clipService.getAllFromApps().catch(() => []),
        ]);
        if (Array.isArray(tagsResp)) setAllTags(tagsResp.map((t: any) => t.name ?? t));
        if (Array.isArray(appsResp)) setAllApps(appsResp.filter(Boolean).sort());
      } catch {}
    }, TAXONOMY_DEBOUNCE_MS);
  };

  // Core loaders (paginated)
  const loadFirstPage = async () => {
    setLoading(true);
    if (isFiltered) setCountLoading(true);
    try {
  if (isFiltered) {
    // counts first
    let cnt = 0;
    try {
      cnt = await clipService.getNumFilteredClips(searchCSV, timeFrame, selectedTags, selectedApps, favoritesOnly);
      setFilteredCount(cnt);
    } catch (e) {
      console.error("Failed to fetch filtered count", e);
      setFilteredCount(0);
      // count failure alone shouldn't trigger main fetch error yet
    }
    setCountLoading(false);
    const page = await clipService.filterNClips(searchCSV, timeFrame, pageSize, selectedTags, selectedApps, favoritesOnly);
    const mapped = page.map(fromApi);
    setClips(mapped);
    refreshTaxonomy(true); // immediate fetch for tests / initial render
    setHasMore(mapped.length > 0 && mapped.length < cnt ? true : (mapped.length === pageSize));
    setFetchError(null); // success path
  } else {
        let cnt = 0;
        try {
          cnt = await clipService.getNumClips();
          setTotalCount(cnt);
        } catch (e) {
          console.error("Failed to fetch total count", e);
          setTotalCount(0);
          // total count failure alone shouldn't mark clips error yet
        }
        // start with most recent N
        const page = await clipService.getRecentClips(pageSize);
        const mapped = page.map(fromApi);
        setClips(mapped);
        refreshTaxonomy(true);
        setHasMore(mapped.length > 0 && (mapped.length < cnt ? true : mapped.length === pageSize));
        setFetchError(null); // success path
      }
    } catch (e) {
      // Fallbacks in case API specialized endpoints fail
      console.error("First page load failed; attempting fallback", e);
      try {
        const dto = await clipService.getAllClips();
        const mapped = dto.map(fromApi);
        setClips(mapped);
        refreshTaxonomy(true);
        setHasMore(false);
        setTotalCount(mapped.length);
        setFetchError(null); // fallback success clears error
      } catch (e2) {
        console.error("Fallback load failed", e2);
        setFetchError("Failed to load clips");
      }
    } finally {
      setLoading(false);
      setCountLoading(false);
    }
  };

  const loadMore = async () => {
    if (loading || !hasMore) return;
    const oldestId = clips[clips.length - 1]?.Id;
    if (!oldestId) return;
    setLoading(true);
    try {
      let page;
      if (isFiltered) {
        page = await clipService.filterNClipsBeforeId(searchCSV, timeFrame, pageSize, oldestId, selectedTags, selectedApps, favoritesOnly);
      } else {
        page = await clipService.getNClipsBeforeId(pageSize, oldestId);
      }
      const mapped = page.map(fromApi);
      setClips((prev) => [...prev, ...mapped]);
  refreshTaxonomy(true);
      // Determine if more pages exist
      if (isFiltered) {
        const expected = (clips.length + mapped.length);
        setHasMore(mapped.length === pageSize && expected < filteredCount);
      } else {
        const expected = (clips.length + mapped.length);
        setHasMore(mapped.length === pageSize && expected < totalCount);
      }
      setFetchError(null); // successful load more clears error
    } catch (e) {
      console.error("Load more failed", e);
      setHasMore(false);
      setFetchError("Failed to load more clips");
    } finally {
      setLoading(false);
    }
  };

  const refreshClips = async () => {
    await loadFirstPage();
  };

  // Load first page on mount and whenever filters change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadFirstPage();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchCSV, timeFrame, favoritesOnly, selectedTags.join(','), selectedApps.join(',')]);

  // Load tags and apps taxonomy on mount
  useEffect(() => {
  refreshTaxonomy(true);
    // Cleanup debounce timeout on unmount
    return () => {
      if (taxonomyRefreshTimeout.current) clearTimeout(taxonomyRefreshTimeout.current);
    };
  }, [clipService, setAllTags, setAllApps]);

  const toggleFavoriteClip = async (clip: ClipModel) => {
    // Optimistically update UI
    setClips(prev => prev.map(c => c.Id === clip.Id ? { ...c, IsFavorite: clip.IsFavorite } : c));
    try {
      if (clip.IsFavorite) {
        await clipService.addFavorite(clip.Id);
      } else {
        await clipService.removeFavorite(clip.Id);
      }
      // If favoritesOnly filter is active, handle pruning after refresh
    } catch (e) {
      // Optionally revert UI if API fails
      setClips(prev => prev.map(c => c.Id === clip.Id ? { ...c, IsFavorite: !clip.IsFavorite } : c));
      console.error('Failed to toggle favorite', e);
    }
  };

  const handleMultiSelect = (value: string, kind: 'tags' | 'apps') => {
    const [selected, setter] = kind === 'tags' ? [selectedTags, setSelectedTags] : [selectedApps, setSelectedApps];
    if (selected.includes(value)) setter(selected.filter(v => v !== value)); else setter([...selected, value]);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (showTagMenu && tagMenuRef.current && !tagMenuRef.current.contains(t)) setShowTagMenu(false);
      if (showAppMenu && appMenuRef.current && !appMenuRef.current.contains(t)) setShowAppMenu(false);
      if (showTimeMenu && timeMenuRef.current && !timeMenuRef.current.contains(t)) setShowTimeMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showTagMenu, showAppMenu, showTimeMenu]);

  const [globalExternalCopyNonce, setGlobalExternalCopyNonce] = useState(0);
  const { markSelfCopy } = useClipboardWatcher({
    enabled: true,
    deps: [isFiltered, searchCSV, timeFrame, selectedTags.join(','), selectedApps.join(','), globalExternalCopyNonce],
    existingClips: clips,
    registerApp: (app) => setAllApps(prev => prev.includes(app) ? prev : [...prev, app].filter(Boolean).sort()),
    onNewClip: async () => { await loadFirstPage(); },
    onExternalClipboardChange: () => setGlobalExternalCopyNonce(n => n + 1)
  });
  // Infinite scroll: observe sentinel
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          void loadMore();
        }
      }
    }, { root: null, rootMargin: "200px", threshold: 0 });
    io.observe(node);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelRef.current, hasMore, loading, clips.length, searchCSV, timeFrame]);

  const handleCopy = async (clip: { Content: string }, _index?: number) => {
    try {
      // Prefer Electron clipboard if exposed, fallback to Web Clipboard API
      const text = (clip?.Content ?? "").toString();
      const api = (window as any)?.electronAPI;
      const hasElectronWrite = api && api.clipboard && typeof api.clipboard.writeText === 'function';
      let copied = false;
      if (hasElectronWrite) {
        try {
          api.clipboard.writeText(text);
          copied = true;
        } catch {}
      }
      if (!copied) {
        const webClipboard: any = (navigator as any)?.clipboard;
        if (webClipboard && typeof webClipboard.writeText === 'function') {
          try {
            await webClipboard.writeText(text);
            copied = true;
          } catch {}
        }
      }
      if (!copied) {
        // Legacy fallback: temporary textarea + execCommand
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          ta.style.pointerEvents = 'none';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          if (ok) copied = true;
        } catch {}
      }
      if (!copied) {
        throw new Error("No clipboard API available");
      }
  // Guard to avoid re-adding our own copy
  markSelfCopy(text);
    } catch (e) {
      // Non-fatal; could show a toast in the future
      console.error("Copy failed", e);
    }
  };

  const handleDelete = (id: number) => {
    // Optimistically remove clip immediately
    setClips(prev => {
      const idx = prev.findIndex(c => c.Id === id);
      if (idx === -1) return prev;
      pendingDeletionRef.current[id] = { clip: prev[idx], index: idx };
      const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      return next;
    });
    if (isFiltered) {
      setFilteredCount(c => Math.max(0, c - 1));
    } else {
      setTotalCount(c => Math.max(0, c - 1));
    }
    // Fire API call
    (async () => {
      try {
        await clipService.deleteClip(id);
        // Success: cleanup stored backup
        delete pendingDeletionRef.current[id];
      } catch (e) {
        console.error("Delete failed", e);
        // Restore counts
        if (isFiltered) {
          setFilteredCount(c => c + 1);
        } else {
          setTotalCount(c => c + 1);
        }
        // Restore clip in original position if still absent
        setClips(prev => {
          if (prev.some(c => c.Id === id)) return prev; // already restored externally
          const backup = pendingDeletionRef.current[id];
          if (!backup) return prev;
          const arr = [...prev];
          const insertAt = Math.min(backup.index, arr.length);
            arr.splice(insertAt, 0, backup.clip);
          return arr;
        });
        delete pendingDeletionRef.current[id];
      }
    })();
  };

  return (
    <>
      <div className={`search-row ${isFiltered && clips.length === 0 ? "no-results" : ""}`}>
        <div className="search-left">
          <button
            type="button"
            className={`icon-button refresh-btn${loading ? " spinning" : ""}`}
            title="Refresh"
            aria-label="Refresh"
            onClick={() => void refreshClips()}
            disabled={loading}
          >
            <span className="icon icon-refresh" aria-hidden />
          </button>
          {fetchError && (
            <span className="fetch-error" role="status" aria-live="polite">{fetchError}</span>
          )}
        </div>
        <div className="search-right">
          <div className="search-count" aria-live="polite">
            {(isFiltered ? countLoading : loading) && (
              <span className="icon icon-spinner spinner-inline" aria-label="Loading" />
            )}
            {displayCount} {isFiltered ? (displayCount === 1 ? "matching result" : "matching results") : (displayCount === 1 ? "item" : "items")}
          </div>
          {/* Favorites toggle (icon star) */}
          <button
            type="button"
            className={`icon-button fav-filter-btn${favoritesOnly ? ' active' : ''}`}
            aria-pressed={favoritesOnly}
            aria-label={favoritesOnly ? 'Show all clips' : 'Show only favorites'}
            title={favoritesOnly ? 'Showing favorites (click to show all)' : 'Show only favorites'}
            onClick={() => setFavoritesOnly(f => !f)}
          >
            <span
              className="icon icon-star_filled"
              style={{ background: favoritesOnly ? '#facc15' : '#4a4f58' }}
              aria-hidden
            />
          </button>
          {/* Tags dropdown */}
          <div className="dropdown" ref={tagMenuRef}>
            <span className="icon icon-tag" aria-hidden style={{ color: 'var(--muted)' }} />
            <button
              type="button"
              className={`trigger${showTagMenu ? ' active' : ''}`}
              onClick={() => setShowTagMenu(v => !v)}
              aria-expanded={showTagMenu}
              aria-haspopup="listbox"
              title={`Filter by tags${selectedTags.length ? `: ${selectedTags.slice(0,5).join(', ')}${selectedTags.length>5?', …':''}` : ''}`}
            >
              Tags {selectedTags.length ? `(${selectedTags.length})` : ''}
            </button>
            {showTagMenu && (
              <div className="dropdown-options open" role="listbox">
                {allTags.length === 0 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>No tags</div>}
                {allTags.map(tag => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button key={tag} type="button" className={`pill${active ? ' active' : ''}`} onClick={() => handleMultiSelect(tag, 'tags')} aria-pressed={active}>{tag}</button>
                  );
                })}
              </div>
            )}
          </div>
          {/* Apps dropdown */}
          <div className="dropdown" ref={appMenuRef}>
            <span className="icon icon-label" aria-hidden style={{ color: 'var(--muted)' }} />
            <button
              type="button"
              className={`trigger${showAppMenu ? ' active' : ''}`}
              onClick={() => setShowAppMenu(v => !v)}
              aria-expanded={showAppMenu}
              aria-haspopup="listbox"
              title={`Filter by apps${selectedApps.length ? `: ${selectedApps.slice(0,5).join(', ')}${selectedApps.length>5?', …':''}` : ''}`}
            >
              Apps {selectedApps.length ? `(${selectedApps.length})` : ''}
            </button>
            {showAppMenu && (
              <div className="dropdown-options open" role="listbox">
                {allApps.length === 0 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>No apps</div>}
                {allApps.map(app => {
                  const active = selectedApps.includes(app);
                  return (
                    <button key={app} type="button" className={`pill${active ? ' active' : ''}`} onClick={() => handleMultiSelect(app, 'apps')} aria-pressed={active}>{app}</button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="filter-select" role="group" aria-label="Filter by date range">
            <span className="icon icon-calendar" aria-hidden />
            {/* Visually hidden native select kept for accessibility & existing tests */}
            <select
              aria-label="Date range"
              value={range}
              onChange={e => { setRange(e.target.value as typeof range); setShowTimeMenu(false); }}
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0 0 0 0)',
                border: 0
              }}
            >
              <option value="all">All time</option>
              <option value="24h">Past 24 hours</option>
              <option value="week">Past week</option>
              <option value="month">Past month</option>
              <option value="year">Past year</option>
            </select>
            <div className="dropdown" ref={timeMenuRef}>
              <button
                type="button"
                className={`trigger${showTimeMenu ? ' active' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={showTimeMenu}
                onClick={() => setShowTimeMenu(v => !v)}
                title="Select time range"
              >
                {(() => {
                  switch (range) {
                    case '24h': return 'Past 24 hours';
                    case 'week': return 'Past week';
                    case 'month': return 'Past month';
                    case '3months': return 'Past 3 months';
                    case 'year': return 'Past year';
                    default: return 'All time';
                  }
                })()}
              </button>
              {showTimeMenu && (
                <div className={`dropdown-options open`} role="listbox" aria-label="Date range">
                  {([
                    ['all','All time'],
                    ['24h','Past 24 hours'],
                    ['week','Past week'],
                    ['month','Past month'],
                    ['3months','Past 3 months'],
                    ['year','Past year'],
                  ] as [Range,string][]).map(([val,label]) => {
                    const active = range === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        className={`pill${active ? ' active' : ''}`}
                        aria-selected={active}
                        role="option"
                        onClick={() => { setRange(val); setShowTimeMenu(false); }}
                      >{label}</button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <form
            className="search-bar"
            role="search"
            onSubmit={(e) => { e.preventDefault(); }}
          >
            <button
              type="submit"
              className="icon-button search-btn left"
              aria-label="Search"
              title="Search"
            >
              <span className="icon icon-search" aria-hidden />
            </button>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clips"
              aria-label="Search clips"
            />
            {query && (
              <button
                type="button"
                className="icon-button clear-btn"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                title="Clear"
              >
                <span className="icon icon-close" aria-hidden />
              </button>
            )}
          </form>
        </div>
      </div>

      <div className={`clips-container ${clips.length === 0 ? "is-empty" : ""}`}>
        <ClipList clips={clips} onCopy={handleCopy} onDelete={handleDelete} onToggleFavorite={toggleFavoriteClip} isSearching={isFiltered} externalClipboardNonce={globalExternalCopyNonce} onTagAdded={async (tag) => {
          if (tag && !allTags.includes(tag)) setAllTags(prev => [...prev, tag].sort());
          // Debounced refresh from server to capture any concurrent changes
          refreshTaxonomy();
        }} />
        {/* sentinel for infinite scrolling */}
        <div ref={sentinelRef} className="infinite-sentinel" aria-hidden="true" style={{ height: 1 }} />
      </div>
    </>
  );
}
