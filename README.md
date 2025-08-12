# Extended Clipboard Desktop App

An Electron + React (Vite + TypeScript) desktop client for the Extended Clipboard API. It monitors your system clipboard, saves new clips to the server, and lets you browse, search, filter, copy, and delete saved clips. Background monitoring continues even when the app window is unfocused.

## Features

- Background clipboard monitoring (polls every 1.5s) and saves new text clips
- Fast UI with React 19 + Vite
- Search and time-range filters with live counts
- Infinite scrolling/pagination
- Copy-to-clipboard with robust fallbacks
- Delete single or all clips

## Quick start

Prerequisites:

- Node.js 18+ (LTS recommended)
- The Extended Clipboard API running locally or remotely

1. Install dependencies

```bash
npm install
```

1. Configure API base URL (optional in dev)

Create a `.env.local` (or `.env`) in the project root if your API isn’t on the same origin:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Notes:

- In development, the app uses relative URLs by default. If your API is on a different origin, set `VITE_API_BASE_URL` to avoid CORS issues.

1. Run the app in development

```bash
npm run dev
```

This starts:

- TypeScript watch for the Electron main process
- Vite dev server for the renderer (default <http://localhost:5174>)
- Electron in development mode with auto-reload

1. Build for production

```bash
npm run build
npm start
```

This compiles the Electron main process and the Vite renderer into `dist/`, then launches Electron against the built assets.

## Scripts

- `npm run dev` — Start main TS watcher, Vite dev server, and Electron with reload
- `npm run build` — Build Electron main and Vite renderer to `dist/`
- `npm start` — Start Electron using the built output
- `npm test` — Run unit tests (Vitest)
- `npm run test:watch` — Watch mode tests
- `npm run coverage` — Run tests with coverage report

## Configuration

- `VITE_API_BASE_URL` (optional): Absolute base URL for the API in production or when not using a dev proxy. Example: `http://localhost:8000`.

Clipboard polling interval: 1.5s in both the main process (background) and the renderer’s fallback poller (disabled when background mode is active).

## Architecture overview

Top-level folders:

```text
src/
  main/       # Electron main process (background clipboard polling, IPC)
  renderer/   # React app (Home & Settings, lists, search, filters)
  services/   # API client (clipService)
  models/     # Data models and mappers
```

### Main process (`src/main/main.ts`)

- Polls the system clipboard using Electron’s `clipboard` API every 1.5s
- Emits `clipboard:new` IPC event with `{ text }` when the clipboard changes
- Handles `clipboard:isBackgroundActive` to inform the renderer that background monitoring is running
- Creates the BrowserWindow and loads the Vite dev server (dev) or built `index.html` (prod)

### Preload (`src/main/preload.ts`)

Exposes a minimal, safe API on `window.electronAPI`:

- `clipboard.readText()` / `clipboard.writeText(text)`
- `background.isActive()` — resolves to `true` when main is polling in the background
- `background.onNew(cb)` — subscribe to background clipboard events

### Renderer (`src/renderer`)

React 19 app with:

- Home page for browsing/searching/filtering clips with infinite scroll
- Settings page for destructive actions (delete all)
- Background-aware behavior: when main background is active, the local poller is disabled and the renderer listens to `clipboard:new`; after adding a clip to the API, the first page is reloaded (filtered or unfiltered, depending on current view)

### API client (`src/services/clipService.ts`)

Lightweight fetch wrapper using optional `VITE_API_BASE_URL`. Implements endpoints such as:

- `GET /clipboard/get_recent_clips?n=`
- `GET /clipboard/get_all_clips`
- `POST /clipboard/add_clip`
- `POST /clipboard/delete_clip?id=`
- `POST /clipboard/delete_all_clips`
- `GET /clipboard/get_all_clips_after_id?after_id=`
- `GET /clipboard/get_n_clips_before_id?n=&before_id=`
- Filtered variants: `filter_all_clips`, `filter_n_clips`, `filter_all_clips_after_id`, `filter_n_clips_before_id`, and `get_num_filtered_clips`

## Testing

Run the suite:

```bash
npm test
```

With coverage:

```bash
npm run coverage
```

The tests cover services, models, and UI components.

## Troubleshooting

- API connection/CORS errors in dev: set `VITE_API_BASE_URL` to your API origin in `.env.local`.
- Port conflicts: Vite defaults to 5174. Stop other processes or change the port in `package.json` → `dev:renderer`.
- Background monitoring not working: ensure the app reached `whenReady` and no errors appear in the main process logs. The renderer should report background active and avoid its own poller.
- Clipboard access: Electron APIs are used via preload; web clipboard fallbacks require a secure context and may be restricted by the OS.

## Contributing

1. Fork and create a feature branch
2. Make changes with tests where applicable
3. Run `npm test` and ensure coverage stays healthy
4. Open a pull request describing the change

## License

See [LICENSE](./LICENSE).
