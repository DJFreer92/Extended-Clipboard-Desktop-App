import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/styles.scss";
import SettingsPage from "./pages/settingsPage";
import HomePage from "./pages/homePage";

function App() {
  const [page, setPage] = useState<"home" | "settings">("home");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-bar">
          <div className="header-left">
            <h1>Extended Clipboard</h1>
            <p className="subtitle">All your copied text, at a glance</p>
          </div>
          <div className="header-right">
            {page !== "settings" ? (
              <button
                type="button"
                className="icon-button settings-btn"
                aria-label="Open settings"
                title="Settings"
                onClick={() => setPage("settings")}
              >
                <span className="icon icon-settings" aria-hidden />
              </button>
      ) : (
              <button
                type="button"
                className="icon-button settings-btn"
                aria-label="Back"
                title="Back"
                onClick={() => setPage("home")}
              >
        <span className="icon icon-home" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="app-main">
        {page === "settings" ? <SettingsPage /> : <HomePage />}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
