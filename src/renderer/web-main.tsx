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
		console.log("Extended Clipboard Web Version - Initializing...");

		// Register service worker for PWA capabilities
		webFeatures.registerServiceWorker();

		// Request notification permission for web clipboard notifications
		webFeatures.requestNotificationPermission();

		// Show web deployment notice to users
		if (typeof window !== "undefined") {
			// Add a subtle indicator that this is the web version
			const webIndicator = document.createElement("div");
			webIndicator.style.position = "fixed";
			webIndicator.style.bottom = "10px";
			webIndicator.style.right = "10px";
			webIndicator.style.background = "rgba(37, 99, 235, 0.1)";
			webIndicator.style.color = "#2563eb";
			webIndicator.style.padding = "4px 8px";
			webIndicator.style.borderRadius = "4px";
			webIndicator.style.fontSize = "11px";
			webIndicator.style.fontFamily = "system-ui, sans-serif";
			webIndicator.style.zIndex = "1000";
			webIndicator.style.border = "1px solid rgba(37, 99, 235, 0.2)";
			webIndicator.textContent = "Web Version";
			webIndicator.title = "This is the web version. Some desktop features may be limited.";
			document.body.appendChild(webIndicator);
		}

		// Note: Web clipboard access requires user interaction
		console.log("Web clipboard access requires user interaction. Features will be enabled when needed.");
	}, []);

	return (
		<div className="app-shell">
			<header className="app-header">
				<div className="header-bar">
					<div className="header-left">
						<h1>
							Extended Clipboard
							<span className="tooltip" style={{ marginLeft: 10, verticalAlign: "middle" }}>
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
						<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
							<p className="subtitle">
								All your copied text, at a glance
								{isWebBuild && (
									<span style={{ marginLeft: "8px", fontSize: "0.8em", opacity: 0.7 }}>(Web Version)</span>
								)}
							</p>
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
				<div style={{ display: page === "settings" ? "none" : "block" }} aria-hidden={page === "settings"}>
					<HomePage />
				</div>
				<div style={{ display: page === "settings" ? "block" : "none" }} aria-hidden={page !== "settings"}>
					<SettingsPage />
				</div>
			</main>
		</div>
	);
}

// Initialize the React app for web deployment
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>
);
