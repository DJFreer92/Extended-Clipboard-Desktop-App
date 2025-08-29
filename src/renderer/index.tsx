import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/styles.scss";
import HomePage from "./pages/homePage";
import SettingsPage from "./pages/settingsPage";
import { isWebBuild, webFeatures, platformAPI } from "./utils/platform";

function App() {
  const [page, setPage] = useState<"home" | "settings">("home");

  useEffect(() => {
    // Initialize web-specific features
    if (isWebBuild) {
      // Register service worker for PWA capabilities
      webFeatures.registerServiceWorker();

      // Request notification permission for web clipboard notifications
      webFeatures.requestNotificationPermission();

      // Show web deployment notice
      console.log('Extended Clipboard running in web mode');

      // Note: Web clipboard access requires user interaction
      // The app will prompt for clipboard permissions when needed
    }
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-bar">
          <div className="header-left">
            <h1>
              Extended Clipboard
              <span className="tooltip" style={{ marginLeft: 10, verticalAlign: 'middle' }}>
                <span
                  className="icon icon-lock encrypted-lock tooltip-trigger"
                  aria-label="Encrypted"
                  aria-describedby="enc-tip"
                  tabIndex={0}
                />
                <span id="enc-tip" role="tooltip" className="tooltip-bubble">
                  Your data is encrypted and kept private
                </span>
              </span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p className="subtitle">All your copied text, at a glance</p>
            </div>
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
        <div style={{ display: page === 'settings' ? 'none' : 'block' }} aria-hidden={page === 'settings'}>
          <HomePage />
        </div>
        <div style={{ display: page === 'settings' ? 'block' : 'none' }} aria-hidden={page !== 'settings'}>
          <SettingsPage />
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
