import { useEffect, useState } from "react";
import ClipList from "../components/ClipList";
import {
  useSearchFiltering,
  SearchBar,
  usePagination,
  RefreshButton,
  InfiniteScrollSentinel,
  useClipboardActions,
  useFavorites,
  useClipboardWatcher,
} from "../features";

export default function HomePage() {
  // Search & Filtering
  const searchFiltering = useSearchFiltering();
  const {
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
    timeFrame,
    searchCSV,
    isFiltered,
    tagMenuRef,
    appMenuRef,
    timeMenuRef,
    setQuery,
    setRange,
    setFavoritesOnly,
    setShowTagMenu,
    setShowAppMenu,
    setShowTimeMenu,
    handleMultiSelect,
    addTag,
    addApp,
  } = searchFiltering;

  // Pagination & Data Loading
  const pagination = usePagination({
    searchCSV,
    timeFrame,
    selectedTags,
    selectedApps,
    favoritesOnly,
    isFiltered,
  });

  const {
    clips,
    fetchError,
    loading,
    countLoading,
    displayCount,
    sentinelRef,
    refreshClips,
    handleDelete,
  } = pagination;

  // Clipboard Management
  const { handleCopy, markSelfCopy, globalExternalCopyNonce, onExternalClipboardChange } = useClipboardActions();
  const { toggleFavoriteClip, getFavoriteState } = useFavorites();

  // Clipboard watcher hook
  const { markSelfCopy: watcherMarkSelfCopy } = useClipboardWatcher({
    enabled: true,
    deps: [isFiltered, searchCSV, timeFrame, selectedTags.join(','), selectedApps.join(','), globalExternalCopyNonce],
    existingClips: clips,
    registerApp: addApp,
    onNewClip: async () => { await refreshClips(); },
    onExternalClipboardChange,
  });

  // Enhanced copy handler that marks self copies
  const handleCopyWithMarking = async (clip: { Content: string }, index?: number) => {
    await handleCopy(clip, index);
    markSelfCopy(clip.Content);
    watcherMarkSelfCopy(clip.Content);
  };

  // Enhanced toggle favorite that handles UI updates
  const handleToggleFavorite = async (clip: any) => {
    const currentState = getFavoriteState(clip);
    const updatedClip = { ...clip, IsFavorite: !currentState };
    await toggleFavoriteClip(updatedClip);
  };

  return (
    <>
      <div className={`search-row ${isFiltered && clips.length === 0 ? "no-results" : ""}`}>
        <RefreshButton
          onRefresh={() => void refreshClips()}
          loading={loading}
          fetchError={fetchError}
        />

        <SearchBar
          query={query}
          onQueryChange={setQuery}
          range={range}
          onRangeChange={setRange}
          favoritesOnly={favoritesOnly}
          onFavoritesToggle={() => setFavoritesOnly(f => !f)}
          selectedTags={selectedTags}
          selectedApps={selectedApps}
          allTags={allTags}
          allApps={allApps}
          showTagMenu={showTagMenu}
          showAppMenu={showAppMenu}
          showTimeMenu={showTimeMenu}
          onShowTagMenu={setShowTagMenu}
          onShowAppMenu={setShowAppMenu}
          onShowTimeMenu={setShowTimeMenu}
          tagMenuRef={tagMenuRef}
          appMenuRef={appMenuRef}
          timeMenuRef={timeMenuRef}
          onMultiSelect={handleMultiSelect}
          displayCount={displayCount}
          isFiltered={isFiltered}
          countLoading={countLoading}
          loading={loading}
        />
      </div>

      <div className={`clips-container ${clips.length === 0 ? "is-empty" : ""}`}>
        <ClipList
          clips={clips.map(clip => ({ ...clip, IsFavorite: getFavoriteState(clip) }))}
          onCopy={handleCopyWithMarking}
          onDelete={handleDelete}
          onToggleFavorite={handleToggleFavorite}
          isSearching={isFiltered}
          externalClipboardNonce={globalExternalCopyNonce}
          onTagAdded={addTag}
        />
        <InfiniteScrollSentinel sentinelRef={sentinelRef} />
      </div>
    </>
  );
}
