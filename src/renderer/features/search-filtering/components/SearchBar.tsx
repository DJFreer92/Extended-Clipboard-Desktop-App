import React from "react";
import { Range } from "../hooks/useSearchFiltering";

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  range: Range;
  onRangeChange: (range: Range) => void;
  favoritesOnly: boolean;
  onFavoritesToggle: () => void;
  selectedTags: string[];
  selectedApps: string[];
  allTags: string[];
  allApps: string[];
  showTagMenu: boolean;
  showAppMenu: boolean;
  showTimeMenu: boolean;
  onShowTagMenu: (show: boolean) => void;
  onShowAppMenu: (show: boolean) => void;
  onShowTimeMenu: (show: boolean) => void;
  tagMenuRef: React.RefObject<HTMLDivElement | null>;
  appMenuRef: React.RefObject<HTMLDivElement | null>;
  timeMenuRef: React.RefObject<HTMLDivElement | null>;
  onMultiSelect: (value: string, kind: 'tags' | 'apps') => void;
  displayCount: number;
  isFiltered: boolean;
  countLoading: boolean;
  loading: boolean;
}

export default function SearchBar({
  query,
  onQueryChange,
  range,
  onRangeChange,
  favoritesOnly,
  onFavoritesToggle,
  selectedTags,
  selectedApps,
  allTags,
  allApps,
  showTagMenu,
  showAppMenu,
  showTimeMenu,
  onShowTagMenu,
  onShowAppMenu,
  onShowTimeMenu,
  tagMenuRef,
  appMenuRef,
  timeMenuRef,
  onMultiSelect,
  displayCount,
  isFiltered,
  countLoading,
  loading,
}: SearchBarProps) {
  const rangeOptions: { value: Range; label: string }[] = [
    { value: "all", label: "All time" },
    { value: "24h", label: "Past 24 hours" },
    { value: "week", label: "Past week" },
    { value: "month", label: "Past month" },
    { value: "3months", label: "Past 3 months" },
    { value: "year", label: "Past year" },
  ];

  const currentRangeLabel = rangeOptions.find(opt => opt.value === range)?.label || "All time";

  return (
    <div className="search-right">
      <div className="search-count" aria-live="polite">
        {(isFiltered ? countLoading : loading) && (
          <span className="icon icon-spinner spinner-inline" aria-label="Loading" />
        )}
        {displayCount} {isFiltered ? (displayCount === 1 ? "matching result" : "matching results") : (displayCount === 1 ? "item" : "items")}
      </div>

      {/* Favorites toggle */}
      <button
        type="button"
        className={`icon-button fav-filter-btn${favoritesOnly ? ' active' : ''}`}
        aria-pressed={favoritesOnly}
        aria-label={favoritesOnly ? 'Show all clips' : 'Show only favorites'}
        title={favoritesOnly ? 'Showing favorites (click to show all)' : 'Show only favorites'}
        onClick={onFavoritesToggle}
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
          onClick={() => onShowTagMenu(!showTagMenu)}
          aria-expanded={showTagMenu}
          aria-haspopup="listbox"
          title={`Filter by tags${selectedTags.length ? `: ${selectedTags.slice(0,5).join(', ')}${selectedTags.length>5?', …':''}` : ''}`}
        >
          Tags {selectedTags.length ? `(${selectedTags.length})` : ''}
        </button>
        {showTagMenu && (
          <div className="dropdown-menu" role="listbox">
            {allTags.length === 0 ? (
              <div className="dropdown-item disabled">No tags available</div>
            ) : (
              allTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`dropdown-item multi-select${selectedTags.includes(tag) ? ' selected' : ''}`}
                  onClick={() => onMultiSelect(tag, 'tags')}
                  role="option"
                  aria-selected={selectedTags.includes(tag)}
                >
                  {tag}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Apps dropdown */}
      <div className="dropdown" ref={appMenuRef}>
        <span className="icon icon-label" aria-hidden style={{ color: 'var(--muted)' }} />
        <button
          type="button"
          className={`trigger${showAppMenu ? ' active' : ''}`}
          onClick={() => onShowAppMenu(!showAppMenu)}
          aria-expanded={showAppMenu}
          aria-haspopup="listbox"
          title={`Filter by apps${selectedApps.length ? `: ${selectedApps.slice(0,5).join(', ')}${selectedApps.length>5?', …':''}` : ''}`}
        >
          Apps {selectedApps.length ? `(${selectedApps.length})` : ''}
        </button>
        {showAppMenu && (
          <div className="dropdown-menu" role="listbox">
            {allApps.length === 0 ? (
              <div className="dropdown-item disabled">No apps available</div>
            ) : (
              allApps.map(app => (
                <button
                  key={app}
                  type="button"
                  className={`dropdown-item multi-select${selectedApps.includes(app) ? ' selected' : ''}`}
                  onClick={() => onMultiSelect(app, 'apps')}
                  role="option"
                  aria-selected={selectedApps.includes(app)}
                >
                  {app}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Date range dropdown */}
      <div className="filter-select" role="group" aria-label="Filter by date range">
        <span className="icon icon-calendar" aria-hidden />
        <select
          aria-label="Date range"
          value={range}
          onChange={e => onRangeChange(e.target.value as Range)}
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
          {rangeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="dropdown" ref={timeMenuRef}>
          <button
            type="button"
            className={`trigger${showTimeMenu ? ' active' : ''}`}
            onClick={() => onShowTimeMenu(!showTimeMenu)}
            aria-expanded={showTimeMenu}
            aria-haspopup="listbox"
          >
            {currentRangeLabel}
          </button>
          {showTimeMenu && (
            <div className="dropdown-menu" role="listbox">
              {rangeOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`dropdown-item single-select${range === option.value ? ' selected' : ''}`}
                  onClick={() => {
                    onRangeChange(option.value);
                    onShowTimeMenu(false);
                  }}
                  role="option"
                  aria-selected={range === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search input */}
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
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search clips"
          aria-label="Search clips"
        />
        {query && (
          <button
            type="button"
            className="icon-button clear-btn"
            aria-label="Clear search"
            title="Clear search"
            onClick={() => onQueryChange("")}
          >
            <span className="icon icon-close" aria-hidden />
          </button>
        )}
      </form>
    </div>
  );
}
