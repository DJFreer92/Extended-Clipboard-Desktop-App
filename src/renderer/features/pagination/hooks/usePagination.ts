import { useEffect, useRef, useState } from "react";
import { ClipModel, fromApi } from "../../../../models/clip";
import { clipsService } from "../../../../services/clips/clipsService";
import { searchService } from "../../../../services/search/searchService";

interface UsePaginationProps {
  searchCSV: string;
  timeFrame: string;
  selectedTags: string[];
  selectedApps: string[];
  favoritesOnly: boolean;
  isFiltered: boolean;
  onClipsUpdate?: (clips: ClipModel[]) => void;
  onCountsUpdate?: (totalCount: number, filteredCount: number) => void;
  pageSize?: number;
}

export function usePagination({
  searchCSV,
  timeFrame,
  selectedTags,
  selectedApps,
  favoritesOnly,
  isFiltered,
  onClipsUpdate,
  onCountsUpdate,
  pageSize = 50,
}: UsePaginationProps) {
  const [clips, setClips] = useState<ClipModel[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingDeletionRef = useRef<Record<number, { clip: ClipModel; index: number }>>({});

  const displayCount = isFiltered ? filteredCount : totalCount;

  const loadFirstPage = async () => {
    setLoading(true);
    if (isFiltered) setCountLoading(true);
    try {
      if (isFiltered) {
        // Get filtered count first
        let cnt = 0;
        try {
          cnt = await searchService.getNumFilteredClips(searchCSV, timeFrame, selectedTags, selectedApps, favoritesOnly);
          setFilteredCount(cnt);
          onCountsUpdate?.(totalCount, cnt);
        } catch (e) {
          console.error("Failed to fetch filtered count", e);
          setFilteredCount(0);
        }
        setCountLoading(false);

        // Get filtered clips
        const page = await searchService.filterNClips(searchCSV, timeFrame, pageSize, selectedTags, selectedApps, favoritesOnly);

        // Defensive check: ensure page is an array
        const pageArray = Array.isArray(page) ? page : [];
        const mapped = pageArray.map(fromApi);
        setClips(mapped);
        onClipsUpdate?.(mapped);
        setHasMore(mapped.length > 0 && mapped.length < cnt ? true : (mapped.length === pageSize));
        setFetchError(null);
      } else {
        // Get total count first
        let cnt = 0;
        try {
          cnt = await clipsService.getNumClips();
          setTotalCount(cnt);
          onCountsUpdate?.(cnt, filteredCount);
        } catch (e) {
          console.error("Failed to fetch total count", e);
          setTotalCount(0);
        }

        // Get recent clips
        const page = await clipsService.getRecentClips(pageSize);

        // Defensive check: ensure page is an array
        const pageArray = Array.isArray(page) ? page : [];
        const mapped = pageArray.map(fromApi);
        setClips(mapped);
        onClipsUpdate?.(mapped);
        setHasMore(mapped.length > 0 && (mapped.length < cnt ? true : mapped.length === pageSize));
        setFetchError(null);
      }
    } catch (e) {
      // Fallback attempt

      // IMPORTANT: Do not use getAllClips fallback when filters are active
      // This prevents unfiltered results from overriding filtered views
      if (isFiltered) {
        console.error("Failed to load filtered clips:", e);
        setFetchError("Failed to load filtered clips");
        setClips([]);
        onClipsUpdate?.([]);
        setFilteredCount(0);
        onCountsUpdate?.(totalCount, 0);
      } else {
        console.warn(`[Pagination] No filters active - using getAllClips fallback`);
        try {
          const dto = await clipsService.getAllClips();

          // Defensive check: ensure dto is an array
          const dtoArray = Array.isArray(dto) ? dto : [];
          const mapped = dtoArray.map(fromApi);
          setClips(mapped);
          onClipsUpdate?.(mapped);
          setHasMore(false);
          setTotalCount(mapped.length);
          onCountsUpdate?.(mapped.length, mapped.length);
          setFetchError(null);
        } catch (e2) {
          console.error("Fallback load failed", e2);
          setFetchError("Failed to load clips");
        }
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
        page = await searchService.filterNClipsBeforeId(searchCSV, timeFrame, pageSize, oldestId, selectedTags, selectedApps, favoritesOnly);
      } else {
        page = await clipsService.getNClipsBeforeId(pageSize, oldestId);
      }

      // Defensive check: ensure page is an array
      const pageArray = Array.isArray(page) ? page : [];
      const mapped = pageArray.map(fromApi);
      const newClips = [...clips, ...mapped];
      setClips(newClips);
      onClipsUpdate?.(newClips);

      // Determine if more pages exist
      if (isFiltered) {
        const expected = newClips.length;
        setHasMore(mapped.length === pageSize && expected < filteredCount);
      } else {
        const expected = newClips.length;
        setHasMore(mapped.length === pageSize && expected < totalCount);
      }
      setFetchError(null);
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

  const handleDelete = (id: number) => {
    // Optimistically remove clip immediately
    setClips(prev => {
      const idx = prev.findIndex(c => c.Id === id);
      if (idx === -1) return prev;
      pendingDeletionRef.current[id] = { clip: prev[idx], index: idx };
      const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      onClipsUpdate?.(next);
      return next;
    });

    if (isFiltered) {
      setFilteredCount(c => {
        const newCount = Math.max(0, c - 1);
        onCountsUpdate?.(totalCount, newCount);
        return newCount;
      });
    } else {
      setTotalCount(c => {
        const newCount = Math.max(0, c - 1);
        onCountsUpdate?.(newCount, filteredCount);
        return newCount;
      });
    }

    // Fire API call
    (async () => {
      try {
        await clipsService.deleteClip(id);
        delete pendingDeletionRef.current[id];
      } catch (e) {
        console.error("Delete failed", e);
        // Restore counts
        if (isFiltered) {
          setFilteredCount(c => {
            const newCount = c + 1;
            onCountsUpdate?.(totalCount, newCount);
            return newCount;
          });
        } else {
          setTotalCount(c => {
            const newCount = c + 1;
            onCountsUpdate?.(newCount, filteredCount);
            return newCount;
          });
        }

        // Restore clip in original position if still absent
        setClips(prev => {
          if (prev.some(c => c.Id === id)) return prev;
          const backup = pendingDeletionRef.current[id];
          if (!backup) return prev;
          const arr = [...prev];
          const insertAt = Math.min(backup.index, arr.length);
          arr.splice(insertAt, 0, backup.clip);
          onClipsUpdate?.(arr);
          return arr;
        });
        delete pendingDeletionRef.current[id];
      }
    })();
  };

  // Load first page when filters change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadFirstPage();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFiltered, searchCSV, timeFrame, favoritesOnly, selectedTags.join(','), selectedApps.join(',')]);    // Infinite scroll: observe sentinel
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

  return {
    // State
    clips,
    fetchError,
    loading,
    countLoading,
    hasMore,
    totalCount,
    filteredCount,
    displayCount,

    // Refs
    sentinelRef,

    // Actions
    loadFirstPage,
    loadMore,
    refreshClips,
    handleDelete,
    setClips,
  };
}
