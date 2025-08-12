import { useEffect, useMemo, useRef, useState } from "react";
import { ClipModel, fromApi } from "../../models/clip";
import { clipService } from "../../services/clipService";
import ClipList from "../components/clipList";

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
  const selfCopyGuardRef = useRef<{ text: string; expires: number } | null>(null);
  // Track last clipboard text we intentionally copied (so polling doesn't treat it as new)
  const lastClipboardTextRef = useRef<string>("");
  // Simple timed suppression to skip adding a new clip for a short window after an in-app copy
  const suppressNextAddRef = useRef<number>(0);
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
        // Refresh taxonomy (tags/apps) after fetching filtered clips
        try {
          const [tagsResp, appsResp] = await Promise.all([
            clipService.getAllTags().catch(() => []),
            clipService.getAllFromApps().catch(() => []),
          ]);
          if (Array.isArray(tagsResp)) setAllTags(tagsResp.map(t => (t as any).name ?? t));
          if (Array.isArray(appsResp)) setAllApps(appsResp.filter(Boolean).sort());
        } catch {}
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
        // Refresh taxonomy (tags/apps) after fetching unfiltered clips
        try {
          const [tagsResp, appsResp] = await Promise.all([
            clipService.getAllTags().catch(() => []),
            clipService.getAllFromApps().catch(() => []),
          ]);
            if (Array.isArray(tagsResp)) setAllTags(tagsResp.map(t => (t as any).name ?? t));
            if (Array.isArray(appsResp)) setAllApps(appsResp.filter(Boolean).sort());
        } catch {}
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
        // Refresh taxonomy after fallback load
        try {
          const [tagsResp, appsResp] = await Promise.all([
            clipService.getAllTags().catch(() => []),
            clipService.getAllFromApps().catch(() => []),
          ]);
          if (Array.isArray(tagsResp)) setAllTags(tagsResp.map(t => (t as any).name ?? t));
          if (Array.isArray(appsResp)) setAllApps(appsResp.filter(Boolean).sort());
        } catch {}
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
      // Refresh taxonomy after loading more clips
      try {
        const [tagsResp, appsResp] = await Promise.all([
          clipService.getAllTags().catch(() => []),
          clipService.getAllFromApps().catch(() => []),
        ]);
        if (Array.isArray(tagsResp)) setAllTags(tagsResp.map(t => (t as any).name ?? t));
        if (Array.isArray(appsResp)) setAllApps(appsResp.filter(Boolean).sort());
      } catch {}
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

  // Load tags and derive known apps from current clips periodically / on mount
  useEffect(() => {
    (async () => {
      try {
        const tags = await clipService.getAllTags();
        setAllTags(tags.map(t => t.name));
      } catch {}
    })();
  }, []);
  // Load all distinct app names from server endpoint
  useEffect(() => {
    (async () => {
      try {
        const apps = await clipService.getAllFromApps();
        if (Array.isArray(apps)) setAllApps(apps.filter(Boolean).sort());
      } catch {}
    })();
  }, [clips.length]); // refresh apps list when clip count changes (new or deleted)

  const toggleFavoriteClip = async (clip: ClipModel) => {
    try {
      if (clip.IsFavorite) {
        await clipService.removeFavorite(clip.Id);
      } else {
        await clipService.addFavorite(clip.Id);
      }
      setClips(prev => prev.map(c => c.Id === clip.Id ? { ...c, IsFavorite: !c.IsFavorite } : c));
      if (favoritesOnly && !clip.IsFavorite) {
        // If adding favorite while favoritesOnly filter is active we keep it; removing when active will be pruned next refresh
      }
    } catch (e) {
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

  // Watch system clipboard for new text and add via API (ignore self-copies), then refresh top incrementally
  useEffect(() => {
    // If background poller is active in main process, skip setting up the renderer-side poller and instead
    // subscribe to background notifications to top up the list.
    const bg = (window as any)?.electronAPI?.background;
    let unsubscribe: (() => void) | undefined;
    let stopped = false;
    // Helper to decide if we should suppress adding a clipboard text (self-copy or duplicate)
    const shouldSuppressAdd = (text: string): boolean => {
      const now = Date.now();
      const guard = selfCopyGuardRef.current;
      if (guard && now <= guard.expires && text === guard.text) {
        selfCopyGuardRef.current = null; // consume
        return true;
      }
      if (now <= suppressNextAddRef.current && text === lastClipboardTextRef.current) return true;
      // If text already exists among current clips, skip (prevents duplicate + refresh churn)
      if (clips.some(c => c.Content === text)) return true;
      return false;
    };

    if (bg && typeof bg.isActive === 'function') {
      // Fire and forget; if active, attach listener and bypass local interval
      bg.isActive?.().then((active: boolean) => {
        if (stopped) return;
        if (active && typeof bg.onNew === 'function') {
            unsubscribe = bg.onNew(async (payload: { text: string; appName?: string }) => {
            // A new system clipboard text was detected; add then refresh the current view
            try {
                const text = (payload?.text ?? '').toString();
              if (text) {
                if (shouldSuppressAdd(text)) {
                  lastClipboardTextRef.current = text; // sync
                  return; // skip refresh
                }
                try {
                    let appName: string | undefined = payload?.appName;
                    if (!appName) {
                      // Try frontmost app API, then fallback to electron app name
                      try { appName = await (window as any)?.electronAPI?.frontmostApp?.getName?.(); } catch {}
                      if (!appName) { try { appName = await (window as any)?.electronAPI?.app?.getName?.(); } catch {} }
                    }
                  await clipService.addClip(text, appName);
                  if (appName && !allApps.includes(appName)) {
                    setAllApps(prev => [...prev, appName!].filter(Boolean).sort());
                  }
                } catch (e) { console.error('Background add failed', e); }
                await loadFirstPage();
              }
            } catch (e) {
              console.error('Background refresh failed', e);
            }
          });
        }
      }).catch(() => {});
    }

  let cancelled = false;
  let ticking = false;
  // Use refs for last observed clipboard and primed state so external copy handler can sync
  const lastTextRef = { current: lastClipboardTextRef.current };
  const primedRef = { current: !!lastClipboardTextRef.current } as { current: boolean };

    const readClipboard = async (): Promise<string> => {
      // Try Electron first (synchronous API)
      try {
        const api = (window as any)?.electronAPI;
        if (api && api.clipboard && typeof api.clipboard.readText === 'function') {
          const text = api.clipboard.readText();
          return text ?? "";
        }
      } catch {}
      // Fallback to Web Clipboard API (asynchronous, may require secure context and permissions)
      try {
        const webClipboard: any = (navigator as any)?.clipboard;
        if (webClipboard && typeof webClipboard.readText === 'function') {
          const t = await webClipboard.readText();
          return t ?? "";
        }
      } catch {}
      return "";
    };

  const tick = async () => {
      if (cancelled) return;
      ticking = true;
      try {
        const current = await readClipboard();
        // Prime on first non-empty read to avoid posting pre-existing clipboard content at startup
        if (!primedRef.current) {
          if (current) {
            lastTextRef.current = current;
            lastClipboardTextRef.current = current;
            primedRef.current = true;
          }
          return;
        }
        if (current && current !== lastTextRef.current) {
          const nowTs = Date.now();
          // If we've recently copied inside the app, suppress adding (even if OS normalizes whitespace)
          if (nowTs <= suppressNextAddRef.current) {
            lastTextRef.current = current;
            lastClipboardTextRef.current = current;
            return;
          }
          // If this change was produced by our own copy button recently, skip adding
          const guard = selfCopyGuardRef.current;
          const now = Date.now();
          if (guard && now <= guard.expires && current === guard.text) {
            lastTextRef.current = current;
            selfCopyGuardRef.current = null; // consume guard
            lastClipboardTextRef.current = current;
            return;
          }
          lastTextRef.current = current;
          lastClipboardTextRef.current = current;
            try {
              let appName: string | undefined;
              try { appName = await (window as any)?.electronAPI?.frontmostApp?.getName?.(); } catch {}
              if (!appName) { try { appName = await (window as any)?.electronAPI?.app?.getName?.(); } catch {} }
              await clipService.addClip(current, appName);
            if (appName && !allApps.includes(appName)) {
              setAllApps(prev => [...prev, appName!].filter(Boolean).sort());
            }
            await loadFirstPage();
          } catch (e) {
            console.error("Failed to add clip or refresh", e);
          }
        }
      } finally {
        ticking = false;
      }
    };

    let interval: any;
    const start = async () => {
      // If background is active, do not start the local interval
      try {
        if (bg && typeof bg.isActive === 'function') {
          const active = await bg.isActive();
          if (active) return; // polling in main process
        }
      } catch {}
      // Try to set lastText from clipboard; priming will also ensure we don't post pre-existing values
      try {
        const initial = await readClipboard();
        if (initial) {
          lastTextRef.current = initial;
          lastClipboardTextRef.current = initial;
          primedRef.current = true;
        }
      } catch {}
      interval = setInterval(() => {
        if (!ticking) void tick();
      }, 1500); // poll every 1.5s
    };
    void start();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (unsubscribe) unsubscribe();
      stopped = true;
    };
  }, [isFiltered, searchCSV, timeFrame, clips]);

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
      // Guard against watcher re-posting our own copy for a short window (only after success)
  selfCopyGuardRef.current = { text, expires: Date.now() + 3000 }; // extend guard
  lastClipboardTextRef.current = text;
  suppressNextAddRef.current = Date.now() + 3200; // suppress polling add for 3.2s
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
          <div className="multi-select" ref={tagMenuRef}>
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
              <div className="multi-select-options open" role="listbox">
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
          <div className="multi-select" ref={appMenuRef}>
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
              <div className="multi-select-options open" role="listbox">
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
                whiteSpace: 'nowrap',
                border: 0
              }}
            >
              <option value="all">All time</option>
              <option value="day">Past day</option>
              <option value="week">Past week</option>
              <option value="month">Past month</option>
              <option value="year">Past year</option>
            </select>
  <div className="single-select" ref={timeMenuRef}>
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
                <div className={`single-select-options open`} role="listbox" aria-label="Date range">
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
                        className={active ? 'active' : ''}
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
  <ClipList clips={clips} onCopy={handleCopy} onDelete={handleDelete} onToggleFavorite={toggleFavoriteClip} isSearching={isFiltered} onTagAdded={async (tag) => {
    if (tag && !allTags.includes(tag)) setAllTags(prev => [...prev, tag].sort());
    // Also refresh from server (non-blocking) to capture any concurrent changes
    try { const tags = await clipService.getAllTags(); setAllTags(tags.map(t => t.name)); } catch {}
  }} />
        {/* sentinel for infinite scrolling */}
        <div ref={sentinelRef} className="infinite-sentinel" aria-hidden="true" style={{ height: 1 }} />
      </div>
    </>
  );
}
