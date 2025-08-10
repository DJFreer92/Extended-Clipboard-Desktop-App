import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import ClipList from "./components/ClipList";
import "./styles/styles.scss";

function App() {
  const [page, setPage] = useState<"home" | "settings">("home");
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const [clips, setClips] = useState<{ Content: string; Timestamp: number }[]>([
    { Content: "Example clip 1", Timestamp: now - 2 * 60 * 1000 },
    { Content: "Another copied text", Timestamp: now - 10 * 60 * 1000 },
    { Content: "This is a much longer clip meant to test the ellipsis behavior when the text is too long to fit on a single line within the list item container.", Timestamp: now - 20 * 60 * 1000 },
    { Content: "Short", Timestamp: now - 40 * 60 * 1000 },
    { Content: "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.", Timestamp: now - 2 * day },
    { Content: "Curabitur non nulla sit amet nisl tempus convallis quis ac lectus.", Timestamp: now - 2 * day - 2 * 60 * 60 * 1000 },
    { Content: "Proin eget tortor risus.", Timestamp: now - 3 * day },
    { Content: "Vivamus suscipit tortor eget felis porttitor volutpat.", Timestamp: now - 3 * day - 5 * 60 * 60 * 1000 },
    { Content: "Cras ultricies ligula sed magna dictum porta.", Timestamp: now - 10 * day },
    { Content: "Praesent sapien massa, convallis a pellentesque nec, egestas non nisi.", Timestamp: now - 10 * day - 2 * 60 * 60 * 1000 },
    { Content: "Donec sollicitudin molestie malesuada.", Timestamp: now - 18 * day },
    { Content: "Nulla quis lorem ut libero malesuada feugiat.", Timestamp: now - 18 * day - 1 * 60 * 60 * 1000 },
    { Content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", Timestamp: now - 24 * day },
    { Content: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.", Timestamp: now - 24 * day - 4 * 60 * 60 * 1000 },
    { Content: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.", Timestamp: now - 30 * day },
    { Content: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", Timestamp: now - 45 * day },
    { Content: "Sed porttitor lectus nibh.", Timestamp: now - 60 * day },
    { Content: "Mauris blandit aliquet elit, eget tincidunt nibh pulvinar a.", Timestamp: now - 75 * day },
    { Content: "Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui.", Timestamp: now - 90 * day },
    { Content: "Quisque velit nisi, pretium ut lacinia in, elementum id enim.", Timestamp: now - 180 * day },
    { Content: "Curabitur arcu erat, accumsan id imperdiet et, porttitor at sem.", Timestamp: now - 200 * day },
    { Content: "Sed porttitor lectus nibh. Curabitur aliquet quam id dui posuere blandit.", Timestamp: now - 230 * day },
    { Content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.", Timestamp: now - 360 * day },
    { Content: "Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.", Timestamp: now - 400 * day },
  ]);

  // Search state
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<"all" | "24h" | "week" | "month" | "3months" | "year">("all");

  const terms = useMemo(() =>
    query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.toLowerCase()),
  [query]);

  const filteredBySearch = useMemo(() => {
    if (!terms.length) return clips;
    return clips.filter((c) => terms.every((t) => c.Content.toLowerCase().includes(t)));
  }, [clips, terms]);

  const cutoff = useMemo(() => {
    const nowTs = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    switch (range) {
      case "24h":
        return nowTs - oneDay;
      case "week":
        return nowTs - 7 * oneDay;
      case "month":
        return nowTs - 30 * oneDay;
      case "3months":
        return nowTs - 90 * oneDay;
      case "year":
        return nowTs - 365 * oneDay;
      default:
        return 0; // all time
    }
  }, [range]);

  const filtered = useMemo(() => {
    if (cutoff === 0) return filteredBySearch;
    return filteredBySearch.filter((c) => c.Timestamp >= cutoff);
  }, [filteredBySearch, cutoff]);

  const isFiltered = terms.length > 0 || range !== "all";
  const resultCount = isFiltered ? filtered.length : clips.length;

  const handleCopy = async (clip: { Content: string }) => {
    try {
  // Prefer Electron clipboard if exposed, fallback to Web Clipboard API
  const electronClipboard = window?.electronAPI?.clipboard;
      if (electronClipboard?.writeText) {
        electronClipboard.writeText(clip.Content);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(clip.Content);
      }
    } catch (e) {
      // Non-fatal; could show a toast in the future
      console.error("Copy failed", e);
    }
  };

  const handleDelete = (index: number) => {
    setClips((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-bar">
          <div className="header-left">
            <h1>Extended Clipboard</h1>
            <p className="subtitle">Your recent copied text, at a glance</p>
          </div>
          <div className="header-right">
            {page !== "settings" && (
              <button
                type="button"
                className="icon-button settings-btn"
                aria-label="Open settings"
                title="Settings"
                onClick={() => setPage("settings")}
              >
                <span className="icon icon-settings" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="app-main">
        {page === "settings" ? (
          <section className="settings-page">
            <h2>Settings</h2>
            <p>Content coming soon.</p>
            <button type="button" className="icon-button" aria-label="Back" title="Back" onClick={() => setPage("home")}>
              <span className="icon icon-back" aria-hidden />
            </button>
          </section>
        ) : (
        <div className={`search-row ${terms.length > 0 && filtered.length === 0 ? "no-results" : ""}`}>
          <div className="search-count" aria-live="polite">
            {resultCount} {isFiltered ? (resultCount === 1 ? "matching result" : "matching results") : (resultCount === 1 ? "item" : "items")}
          </div>
          <div className="filter-select" role="group" aria-label="Filter by date range">
            <span className="icon icon-calendar" aria-hidden />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as any)}
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
            onSubmit={(e) => { e.preventDefault(); /* filtering already live */ }}
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
        )}
        {page === "home" && (
          <ClipList clips={filtered} onCopy={handleCopy} onDelete={handleDelete} isSearching={terms.length > 0} />
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
