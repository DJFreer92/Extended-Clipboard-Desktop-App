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

  // Search state
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<Range>("all");

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

  const isFiltered = terms.length > 0 || range !== "all";
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
          cnt = await clipService.getNumFilteredClips(searchCSV, timeFrame);
          setFilteredCount(cnt);
        } catch (e) {
          console.error("Failed to fetch filtered count", e);
          setFilteredCount(0);
          // count failure alone shouldn't trigger main fetch error yet
        }
        setCountLoading(false);
        const page = await clipService.filterNClips(searchCSV, timeFrame, pageSize);
        const mapped = page.map(fromApi);
        setClips(mapped);
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
        page = await clipService.filterNClipsBeforeId(searchCSV, timeFrame, pageSize, oldestId);
      } else {
        page = await clipService.getNClipsBeforeId(pageSize, oldestId);
      }
      const mapped = page.map(fromApi);
      setClips((prev) => [...prev, ...mapped]);
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
  }, [searchCSV, timeFrame]);

  // Watch system clipboard for new text and add via API (ignore self-copies), then refresh top incrementally
  useEffect(() => {
    // If background poller is active in main process, skip setting up the renderer-side poller and instead
    // subscribe to background notifications to top up the list.
    const bg = (window as any)?.electronAPI?.background;
    let unsubscribe: (() => void) | undefined;
    let stopped = false;
    if (bg && typeof bg.isActive === 'function') {
      // Fire and forget; if active, attach listener and bypass local interval
      bg.isActive?.().then((active: boolean) => {
        if (stopped) return;
        if (active && typeof bg.onNew === 'function') {
          unsubscribe = bg.onNew(async (payload: { text: string }) => {
            // A new system clipboard text was detected; add then refresh the current view
            try {
              const text = (payload?.text ?? '').toString();
              if (text) {
                try { await clipService.addClip(text); } catch (e) { console.error('Background add failed', e); }
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
    let lastText = "";
    let ticking = false;
    const primedRef = { current: false } as { current: boolean };

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
            lastText = current;
            primedRef.current = true;
          }
          return;
        }
        if (current && current !== lastText) {
          // If this change was produced by our own copy button recently, skip adding
          const guard = selfCopyGuardRef.current;
          const now = Date.now();
          if (guard && now <= guard.expires && current === guard.text) {
            lastText = current;
            selfCopyGuardRef.current = null; // consume guard
            return;
          }
          lastText = current;
          try {
            await clipService.addClip(current);
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
        lastText = await readClipboard();
        if (lastText) primedRef.current = true;
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
  }, [isFiltered, searchCSV, timeFrame]);

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
      selfCopyGuardRef.current = { text, expires: Date.now() + 2000 };
    } catch (e) {
      // Non-fatal; could show a toast in the future
      console.error("Copy failed", e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await clipService.deleteClip(id);
      setClips((prev) => prev.filter((c) => c.Id !== id));
      if (isFiltered) {
        setFilteredCount((c) => Math.max(0, c - 1));
      } else {
        setTotalCount((c) => Math.max(0, c - 1));
      }
    } catch (e) {
      console.error("Delete failed", e);
    }
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
          <div className="filter-select" role="group" aria-label="Filter by date range">
            <span className="icon icon-calendar" aria-hidden />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as Range)}
              aria-label="Date range"
            >
              <option value="all">All time</option>
              <option value="24h">Past 24 hours</option>
              <option value="week">Past week</option>
              <option value="month">Past month</option>
              <option value="3months">Past 3 months</option>
              <option value="year">Past year</option>
            </select>
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
        <ClipList clips={clips} onCopy={handleCopy} onDelete={handleDelete} isSearching={isFiltered} />
        {/* sentinel for infinite scrolling */}
        <div ref={sentinelRef} className="infinite-sentinel" aria-hidden="true" style={{ height: 1 }} />
      </div>
    </>
  );
}
