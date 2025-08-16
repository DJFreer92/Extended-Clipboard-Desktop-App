# Extended Clipboard Desktop App

A modern Electron + React desktop client for the Extended Clipboard API. This app provides intelligent clipboard management by automatically monitoring your system clipboard, saving clips to the server, and offering powerful tools to browse, search, filter, and organize your clipboard history. Background monitoring continues seamlessly even when the app window is unfocused.

[Extended Clipboard API repository](https://github.com/DJFreer92/Extended-Clipboard-API)

## ✨ Features

### Core Functionality

- **Smart Background Monitoring**: Polls system clipboard every 1.5s and automatically saves new text clips
- **System Tray Integration**: Quick access popup window with your latest clips (macOS support)
- **React 19 + Vite**: Lightning-fast UI with modern React features and hot module replacement
- **Advanced Search & Filtering**: Full-text search with real-time results and smart filtering
- **Infinite Scrolling**: Smooth pagination with responsive grid layout
- **Intelligent Duplicate Handling**: Prevents duplicates

### Organization & Management

- **Favorites System**: Mark important clips as favorites for quick access
- **Tag Management**: Add custom tags to clips for better organization
- **App-based Filtering**: Filter clips by the application they originated from
- **Time-range Filtering**: Browse clips by date (24h, week, month, 3 months, year, or all time)
- **Bulk Operations**: Delete entire date sections or all clips at once

### User Experience

- **System Tray Access**: Click the tray icon for instant access to recent clips without opening the main app
- **Quick Copy**: Click any clip in the tray to copy it instantly and close the tray window
- **Tray Search**: Real-time search within the tray popup for fast clip retrieval
- **Multi-column Layout**: Responsive grid that adapts to window size
- **Date-grouped Display**: Clips organized by date with collapsible sections
- **One-click Copy**: Click any clip to copy it to your clipboard instantly
- **Visual Feedback**: Indicators and smooth animations
- **Keyboard Navigation**: Full keyboard accessibility support
- **Cross-platform Clipboard**: Fallback support for web clipboard API

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **Extended Clipboard API** running locally or remotely — [DJFreer92/Extended-Clipboard-API](https://github.com/DJFreer92/Extended-Clipboard-API)

### Installation & Setup

1. **Install dependencies**

```bash
npm install
```

1. **Configure API connection (optional)**

Create `.env.local` in the project root if your API isn't running on the default localhost:8000:

```env
VITE_API_BASE_URL=http://localhost:8000
```

> **Note**: In development, the app uses Vite's proxy to avoid CORS issues. Only set `VITE_API_BASE_URL` if your API runs on a different origin.

1. **Start development server**

```bash
npm run dev
```

This command starts:

- TypeScript compiler in watch mode for the Electron main process
- Vite dev server for the React renderer (localhost:5174)
- Electron application with auto-reload on changes

1. **Build for production**

```bash
npm run build
npm start
```

This compiles both the Electron main process and React renderer to `dist/`, then launches the production build.

## 🖱️ System Tray Feature

### Overview

The Extended Clipboard app includes a convenient system tray feature that provides instant access to your clipboard history without opening the main application window. Currently supported on **macOS** with automatic detection and setup.

### Key Features

- **Quick Access**: Click the tray icon to instantly view recent clips
- **Search Within Tray**: Real-time search filtering directly in the popup
- **One-Click Copy**: Click any clip to copy it and automatically close the tray
- **Live Updates**: Clips sync automatically between main app and tray
- **Performance Optimized**: Displays up to 50 recent clips with date grouping

### Usage

1. **Automatic Setup**: On macOS, the tray icon appears automatically in the menu bar
2. **Access Clips**: Click the tray icon to open the popup window
3. **Search**: Type in the search box to filter clips in real-time
4. **Copy**: Click any clip to copy it to your clipboard
5. **Navigate**: Use the "Open App" button to launch the main window
6. **Refresh**: Click the refresh button to update the clip list

### Tray Window Interface

- **Compact Design**: Optimized for quick interactions
- **Date Grouping**: Clips organized by date with collapsible sections
- **App Badges**: Shows which application each clip originated from
- **Time Stamps**: Relative time display (e.g., "2 minutes ago")
- **Smart Truncation**: Long clips are truncated with ellipsis
- **Loading States**: Smooth loading indicators and empty states

### Technical Implementation

The tray feature uses Electron's native Tray API with custom IPC communication:

- **Separate Window**: Dedicated React component (`TrayWindow.tsx`) with its own entry point
- **Background Sync**: Main process manages clip data and search state
- **Event-Driven**: Uses IPC events for real-time updates between main app and tray
- **Platform Detection**: Automatically detects macOS support and enables tray
- **Memory Efficient**: Limits displayed clips and optimizes rendering

### Platform Support

- ✅ **macOS**: Full support with native menu bar integration
- ❌ **Windows**: Not supported
- ❌ **Linux**: Not supported

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development environment (TypeScript watcher + Vite dev server + Electron with auto-reload) |
| `npm run build` | Build both Electron main process and React renderer for production |
| `npm start` | Launch the built production application |
| `npm test` | Run unit tests with Vitest |
| `npm run test:watch` | Run tests in watch mode for development |
| `npm run coverage` | Generate test coverage report |
| `npm run build:main` | Build only the Electron main process |
| `npm run watch:main` | Watch and rebuild the main process on changes |
| `npm run dev:renderer` | Start only the Vite dev server for the renderer |

## ⚙️ Configuration

### Environment Variables

- **`VITE_API_BASE_URL`** (optional): Set this to your API's base URL when it's not running on the same origin as the development server. Example: `http://localhost:8000`

### Application Settings

- **Clipboard Polling Interval**: 1.5 seconds (both main process background monitoring and renderer fallback)
- **Development Port**: 5174 (Vite dev server)
- **Auto-reload**: Enabled in development mode with electronmon

## 🏗️ Architecture Overview

The application follows a modern, modular architecture with clear separation of concerns:

```text
src/
├── main/           # Electron main process
│   ├── main.ts       # App lifecycle, window management, clipboard polling, tray integration
│   ├── preload.ts    # Secure IPC bridge between main and renderer (includes tray APIs)
│   └── config.ts     # Configuration utilities
├── renderer/       # React application
│   ├── index.tsx     # Main app entry point and routing
│   ├── tray.tsx      # Tray window entry point
│   ├── components/   # Reusable UI components
│   ├── features/     # Feature-based modules
│   │   ├── search-filtering/    # Search and filter functionality
│   │   ├── pagination/          # Infinite scroll pagination
│   │   ├── clipboard-management/ # Clipboard operations
│   │   ├── settings/            # Application settings
│   │   ├── clip-list/           # Clip display and interactions
│   │   ├── dates/               # Date handling and formatting
│   │   ├── grouping/            # Data grouping utilities
│   │   ├── tray/                # Tray-specific functionality and hooks
│   │   └── modal/               # Modal dialogs
│   ├── pages/        # Main application pages
│   │   ├── HomePage.tsx         # Main application interface
│   │   ├── SettingsPage.tsx     # Application settings
│   │   └── TrayWindow.tsx       # Compact tray popup interface
│   ├── hooks/        # Custom React hooks
│   ├── styles/       # SCSS modules and design tokens
│   └── utils/        # Utility functions
├── services/       # API client and external services
├── models/         # Data models and type definitions
└── assets/         # Static assets (icons, images)
```

### Core Components

#### **Main Process** (`src/main/main.ts`)

- Manages application lifecycle and window creation
- Implements background clipboard monitoring using Electron's clipboard API
- Detects frontmost application name (macOS support)
- Creates and manages system tray integration with popup window
- Handles secure IPC communication with the renderer
- Sets application identity and dock/taskbar icons

#### **Preload Script** (`src/main/preload.ts`)

Exposes a minimal, secure API to the renderer via `window.electronAPI`:

- `clipboard.readText()` / `clipboard.writeText(text)` — Direct system clipboard access
- `background.isActive()` — Check if background monitoring is running
- `background.onNew(callback)` — Subscribe to clipboard change events
- `app.getName()` — Get application name
- `frontmostApp.getName()` — Get frontmost application name (macOS)
- `tray.isSupported()` — Check if system tray is supported (macOS only)
- `tray.updateClips(clips)` — Send clips data to tray for display
- `tray.setSearchQuery(query)` — Set search filter for tray
- `tray.onRefreshRequest(callback)` — Listen for tray refresh events
- `tray.onCopied(callback)` — Listen for tray copy events

#### **React Renderer** (`src/renderer/`)

Modern React 19 application featuring:

- **Home Page**: Main interface with clip browsing, search, and filtering
- **Settings Page**: Application preferences and bulk operations
- **Tray Window**: Compact popup interface for quick access from system tray
- **Feature Modules**: Organized by functionality (search, pagination, clipboard management, tray, etc.)
- **Responsive Design**: Multi-column layout that adapts to window size
- **Background Integration**: Seamless handoff between main process and renderer clipboard polling
- **Tray Integration**: Real-time sync between main app and tray popup with search capabilities

#### **Modular Services** (`src/services/`)

Organized REST clients for different API domains:

- **Clips Service**: Core clipboard operations (get, add, delete clips)
- **Search Service**: Filtering and search functionality
- **Tags Service**: Tag management and clip-tag associations
- **Favorites Service**: Favorite clip operations
- **Apps Service**: Application-specific filtering

- Full CRUD operations for clips
- Advanced filtering (search, tags, apps, time ranges)
- Pagination support with before/after cursors
- Favorites management
- Tag system with full CRUD operations

## 🎯 Key Behaviors

### Clipboard Management

- **Click-to-Copy**: Click any clip item to instantly copy it to your clipboard
- **Smart Indicators**: "Copied!" feedback persists through UI changes but clears on external clipboard activity
- **Duplicate Prevention**: Prevents duplicates
- **Background Sync**: When main process monitoring is active, renderer polling is disabled for efficiency
- **Tray Integration**: Clips are automatically synced to the tray popup for quick access

### Search & Filtering

- **Real-time Search**: Instant results as you type with full-text matching
- **Multi-filter Support**: Combine search terms, tags, apps, time ranges, and favorites
- **Server-side Processing**: All filtering is handled by the API for optimal performance
- **Live Count Updates**: Result counts update dynamically as filters change

### UI Interactions

- **Responsive Grid**: Multi-column layout adapts to window size (minimum 350px per column)
- **Date Grouping**: Clips automatically grouped by date with collapsible sections
- **Infinite Scroll**: Smooth pagination loads more content as you scroll
- **Keyboard Accessible**: Full keyboard navigation and screen reader support
- **Tray Popup**: Compact interface accessible from system tray (macOS)
- **Cross-Window Sync**: Changes in main app reflect immediately in tray and vice versa

## 🎨 Design System

### Color Tokens

The app uses a comprehensive set of CSS custom properties for consistent theming:

- **Surface Colors**: `--color-bg`, `--color-surface`, `--color-panel`
- **Text Colors**: `--color-text`, `--color-muted`, `--color-selected`
- **Interactive Colors**: `--color-brand`, `--color-danger`, `--color-success`
- **Control States**: `--control-bg`, `--hover-bg`, `--hover-border-neutral`

### Interaction Patterns

- **Neutral Controls**: Search inputs, dropdowns, icon buttons use subtle hover states
- **Primary Actions**: Copy buttons use brand color with high contrast text
- **Destructive Actions**: Delete buttons use danger color with appropriate warnings
- **Focus Management**: Consistent focus rings (`--ring`) for keyboard navigation

## 🧪 Testing

The project maintains 85+% test coverage across services, models, and UI components.

### Running Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run coverage
```

### Test Stack

- **Vitest**: Fast unit test runner with TypeScript support
- **React Testing Library**: Component testing with user-centric queries
- **JSDOM**: Browser environment simulation
- **Mock Service Worker**: API mocking for integration tests

## 🛠️ Troubleshooting

### Common Issues

#### API Connection Errors

- Ensure the Extended Clipboard API is running
- Set `VITE_API_BASE_URL` in `.env.local` if API is on different origin
- Check network connectivity and firewall settings

#### Port Conflicts

- Default Vite port is 5174
- Stop conflicting processes or modify port in `package.json`
- Use `lsof -i :5174` to identify processes using the port

#### Background Monitoring Issues

- Verify app has reached Electron's `whenReady` state
- Check main process logs for errors
- Ensure renderer reports "Background active: true"

#### Tray Issues

- **Tray not appearing**: Ensure you're on macOS (only supported platform currently)
- **Tray not updating**: Check that main app is receiving clipboard updates
- **Search not working**: Ensure the main app has loaded clips successfully

#### Clipboard Access Problems

- Electron APIs require secure context
- Web clipboard fallbacks may be restricted by OS
- Check browser permissions and security settings

### Development Tips

- Use `npm run dev` for auto-reload during development
- Check browser DevTools Console for renderer errors
- Monitor Electron main process output for IPC issues
- Use VS Code's TypeScript integration for better development experience

## 📦 Building & Distribution

### Development Build

```bash
npm run build
```

Compiles TypeScript to `dist/main/` and builds React app to `dist/`.

### Production Considerations

- App name and icon are set at runtime
- For installers, configure electron-builder with platform-specific icons
- Consider code signing for distribution
- Test on target platforms before release

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork** the repository and create a feature branch
2. **Write tests** for new functionality
3. **Maintain coverage** - ensure all tests pass and coverage stays at 100%
4. **Follow conventions** - use existing code style and patterns
5. **Update documentation** - modify README if needed
6. **Submit PR** with clear description of changes

### Development Workflow

```bash
# Clone your fork
git clone https://github.com/yourusername/Extended-Clipboard-Desktop-App.git

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📄 License

This project is licensed under the terms specified in [LICENSE](./LICENSE).
