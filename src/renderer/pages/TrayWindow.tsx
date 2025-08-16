import React, { useEffect, useState } from 'react';
import { ClipModel } from '../../models/clip';
import { formatDistanceToNow } from 'date-fns';
import '../features/tray/styles/TrayWindow.scss';

interface TrayWindowProps {}

export const TrayWindow: React.FC<TrayWindowProps> = () => {
  const [clips, setClips] = useState<ClipModel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load initial clips
    loadClips();

    // Handle blur events to close tray when clicking outside
    const handleBlur = () => {
      if (window.electronAPI?.ipcRenderer?.send) {
        window.electronAPI.ipcRenderer.send('tray:hide-window');
      }
    };

    // Handle escape key to close tray
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (window.electronAPI?.ipcRenderer?.send) {
          window.electronAPI.ipcRenderer.send('tray:hide-window');
        }
      }
    };

    // Add event listeners
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown);

    // Listen for clipboard updates
    const handleClipsUpdate = (_event: any, clips: ClipModel[]) => {
      setClips(clips);
      setLoading(false);
    };

    const handleSearchUpdate = (_event: any, query: string) => {
      setSearchQuery(query);
    };

    if (window.electronAPI?.ipcRenderer?.on) {
      window.electronAPI.ipcRenderer.on('tray:clips-updated', handleClipsUpdate);
      window.electronAPI.ipcRenderer.on('tray:search-updated', handleSearchUpdate);
    }

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown);
      if (window.electronAPI?.ipcRenderer?.removeAllListeners) {
        window.electronAPI.ipcRenderer.removeAllListeners('tray:clips-updated');
        window.electronAPI.ipcRenderer.removeAllListeners('tray:search-updated');
      }
    };
  }, []);

  const loadClips = async () => {
    try {
      setLoading(true);
      // Request clips from main process
      if (window.electronAPI?.ipcRenderer?.send) {
        window.electronAPI.ipcRenderer.send('tray:load-clips');
      }
    } catch (error) {
      console.error('Failed to load clips:', error);
      setLoading(false);
    }
  };

  const handleClipClick = (clip: ClipModel) => {
    // Copy to clipboard and close tray
    if (window.electronAPI?.ipcRenderer?.send) {
      window.electronAPI.ipcRenderer.send('tray:copy-clip', clip.Id);
      window.electronAPI.ipcRenderer.send('tray:close');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (window.electronAPI?.ipcRenderer?.send) {
      window.electronAPI.ipcRenderer.send('tray:search', query);
    }
  };

  const handleOpenApp = () => {
    if (window.electronAPI?.ipcRenderer?.send) {
      window.electronAPI.ipcRenderer.send('tray:open-main-app');
      window.electronAPI.ipcRenderer.send('tray:close');
    }
  };

  const handleRefresh = () => {
    loadClips();
  };

  const handleToggleFavorite = async (clip: ClipModel) => {
    // Handle favorite toggle
    console.log('Toggle favorite:', clip.Id);
  };

  const toggleDateSection = (date: string) => {
    const newCollapsed = new Set(collapsedDates);
    if (newCollapsed.has(date)) {
      newCollapsed.delete(date);
    } else {
      newCollapsed.add(date);
    }
    setCollapsedDates(newCollapsed);
  };

  // Filter clips based on search query
  const filteredClips = searchQuery ?
    clips.filter(clip =>
      clip.Content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.FromAppName?.toLowerCase().includes(searchQuery.toLowerCase())
    ) : clips;

  // Group clips by date
  const groupedClips = new Map<string, ClipModel[]>();
  for (const clip of filteredClips.slice(0, 50)) { // Limit to 50 clips for performance
    const date = new Date(clip.Timestamp).toDateString();
    if (!groupedClips.has(date)) groupedClips.set(date, []);
    groupedClips.get(date)!.push(clip);
  }

  return (
    <div className="tray-window">
      <div className="tray-header">
        <div className="tray-title">
          <div className="title-content">
            <h1 className="title-text">
              Extended Clipboard
              <span className="icon icon-lock encrypted-lock"></span>
            </h1>
            <p className="subtitle">Quick access to your clipboard history</p>
          </div>
          <div className="header-actions">
            <button
              className="action-btn open-btn"
              onClick={handleOpenApp}
              title="Open main app"
            >
              <span className="icon icon-open-in-new"></span>
            </button>
          </div>
        </div>
        <div className="search-container">
          <button
            className="action-btn refresh-btn"
            onClick={handleRefresh}
            title="Refresh clips"
          >
            <span className="icon icon-refresh"></span>
          </button>
          <div className="search-bar">
            <span className="icon icon-search"></span>
            <input
              type="search"
              placeholder="Search clips..."
              value={searchQuery}
              onChange={handleSearchChange}
              autoFocus
            />
          </div>
        </div>
      </div>

      <div className="tray-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner">
              <span className="icon icon-refresh rotating"></span>
            </div>
            <span>Loading clips...</span>
          </div>
        ) : filteredClips.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? (
              <>
                <div className="empty-icon">
                  <span className="icon icon-search"></span>
                </div>
                <p>No clips found</p>
                <span>Try a different search term</span>
              </>
            ) : (
              <>
                <div className="empty-icon">
                  <span className="icon icon-copy"></span>
                </div>
                <p>No clips yet</p>
                <span>Copy something to get started</span>
              </>
            )}
          </div>
        ) : (
          <div className="clips-list">
            {Array.from(groupedClips.entries()).map(([date, dateClips]) => (
              <div key={date} className="date-group">
                <div
                  className="date-header"
                  onClick={() => toggleDateSection(date)}
                  role="button"
                  tabIndex={0}
                >
                  <span className={`collapse-icon ${collapsedDates.has(date) ? 'collapsed' : ''}`}>
                    <span className="icon icon-chevron"></span>
                  </span>
                  {date}
                </div>
                {!collapsedDates.has(date) && (
                  <>
                    {dateClips.slice(0, 10).map((clip) => (
                      <div
                        key={clip.Id}
                        className="clip-item"
                        onClick={() => handleClipClick(clip)}
                        title={`Click to copy\n${clip.Content}`}
                      >
                        <div className="clip-content">
                          {clip.Content.trim().substring(0, 200)}
                          {clip.Content.length > 200 && '...'}
                        </div>
                        <div className="clip-metadata">
                          {clip.FromAppName && (
                            <span className="app-badge">{clip.FromAppName}</span>
                          )}
                          <span className="time-ago">
                            {formatDistanceToNow(new Date(clip.Timestamp), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                    {dateClips.length > 10 && (
                      <div className="more-clips">
                        +{dateClips.length - 10} more clips
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
