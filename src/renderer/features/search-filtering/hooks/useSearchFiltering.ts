import { useEffect, useMemo, useRef, useState } from "react";
import { tagsService } from "../../../../services/tags/tagsService";
import { appsService } from "../../../../services/apps/appsService";

export type Range = "all" | "24h" | "week" | "month" | "3months" | "year";

interface UseSearchFilteringProps {
  onFiltersChange?: () => void;
}

export function useSearchFiltering({ onFiltersChange }: UseSearchFilteringProps = {}) {
  // Search state
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allApps, setAllApps] = useState<string[]>([]);

  // Dropdown states
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showAppMenu, setShowAppMenu] = useState(false);
  const [showTimeMenu, setShowTimeMenu] = useState(false);

  // Refs for dropdown management
  const tagMenuRef = useRef<HTMLDivElement | null>(null);
  const appMenuRef = useRef<HTMLDivElement | null>(null);
  const timeMenuRef = useRef<HTMLDivElement | null>(null);

  // Parsed search terms
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

  // Debounced taxonomy refresh to avoid redundant API calls
  const taxonomyRefreshTimeout = useRef<NodeJS.Timeout | null>(null);
  const taxonomyLastFetched = useRef<number>(0);
  const TAXONOMY_DEBOUNCE_MS = 500;

  const refreshTaxonomy = (immediate = false) => {
    if (immediate) {
      (async () => {
        try {
          const [tagsResp, appsResp] = await Promise.all([
            tagsService.getAllTags().catch(() => []),
            appsService.getAllFromApps().catch(() => []),
          ]);
          interface Tag {
            name: string;
            [key: string]: unknown;
          }
          if (Array.isArray(tagsResp)) setAllTags(tagsResp.map((t: any) => typeof t === "string" ? t : (t.name ?? String(t))));
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
          tagsService.getAllTags().catch(() => []),
          appsService.getAllFromApps().catch(() => []),
        ]);
        if (Array.isArray(tagsResp)) setAllTags(tagsResp.map((t: any) => t.name ?? t));
        if (Array.isArray(appsResp)) setAllApps(appsResp.filter(Boolean).sort());
      } catch {}
    }, TAXONOMY_DEBOUNCE_MS);
  };

  // Load tags and apps taxonomy on mount
  useEffect(() => {
    refreshTaxonomy(true);
    // Cleanup debounce timeout on unmount
    return () => {
      if (taxonomyRefreshTimeout.current) clearTimeout(taxonomyRefreshTimeout.current);
    };
  }, []);

  // Notify parent when filters change
  useEffect(() => {
    onFiltersChange?.();
  }, [searchCSV, timeFrame, favoritesOnly, selectedTags.join(','), selectedApps.join(','), onFiltersChange]);

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

  const addTag = (tag: string) => {
    if (tag && !allTags.includes(tag)) {
      setAllTags(prev => [...prev, tag].sort());
      // Don't refresh taxonomy immediately - let it be refreshed on next natural cycle
      // to avoid overwriting local state before backend has processed the change
    }
  };

  const addApp = (app: string) => {
    if (app && !allApps.includes(app)) {
      setAllApps(prev => [...prev, app].filter(Boolean).sort());
    }
  };

  return {
    // State
    query,
    range,
    favoritesOnly,
    selectedTags,
    selectedApps,
    allTags,
    allApps,
    showTagMenu,
    showAppMenu,
    showTimeMenu,

    // Computed values
    terms,
    timeFrame,
    searchCSV,
    isFiltered,

    // Refs
    tagMenuRef,
    appMenuRef,
    timeMenuRef,

    // Actions
    setQuery,
    setRange,
    setFavoritesOnly,
    setSelectedTags,
    setSelectedApps,
    setShowTagMenu,
    setShowAppMenu,
    setShowTimeMenu,
    handleMultiSelect,
    refreshTaxonomy,
    addTag,
    addApp,
  };
}
