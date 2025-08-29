# GitHub Pages Deployment Guide

This document explains how to deploy Extended Clipboard to GitHub Pages for web access.

## Overview

The Extended Clipboard app now supports dual deployment:

- **Desktop App**: Full Electron application with native clipboard monitoring
- **Web App**: Browser-based version with limited clipboard access (requires user permission)

## Setup Steps

### 1. Enable GitHub Pages

1. Go to your repository settings on GitHub
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select "GitHub Actions"
4. The GitHub Actions workflow will handle deployment automatically

### 2. Add Required Web Assets

Create the following icon files in the `public/` directory:

- `favicon-16x16.png` (16x16 pixels)
- `favicon-32x32.png` (32x32 pixels)
- `apple-touch-icon.png` (180x180 pixels)
- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)

You can generate these from your existing app icon using online tools or ImageMagick.

### 3. Configure API URL (Optional)

If you have a deployed backend API, update the GitHub Actions workflow:

```yaml
- name: Build for web
  run: npm run build:web
  env:
    VITE_BUILD_TARGET: web
    VITE_API_BASE_URL: https://your-api-domain.com
```

### 4. Deploy

Push to the main branch, and GitHub Actions will automatically build and deploy the web version.

## Web vs Desktop Differences

| Feature | Desktop | Web |
|---------|---------|-----|
| Clipboard Monitoring | ✅ Automatic background monitoring | ⚠️ Manual with user permission |
| File System Access | ✅ Full access | ❌ Not available |
| System Notifications | ✅ Native notifications | ✅ Browser notifications (with permission) |
| Offline Support | ✅ Full offline capability | ✅ Limited with service worker |
| App Installation | ✅ Native installer | ✅ PWA install prompt |

## Local Development

### Test Web Build

```bash
npm run build:web
npm run preview:web
```

### Test Electron Build

```bash
npm run build
npm run start
```

## Troubleshooting

### Clipboard Access Issues

- Web browsers require user interaction to access clipboard
- Users must grant clipboard permissions when prompted
- HTTPS is required for clipboard API in production

### Asset Loading Issues

- Ensure all icon files are present in `public/` directory
- Check that relative paths in CSS are correct for the base path
- Verify manifest.json references valid icon files

### GitHub Pages 404 Errors

- Ensure the repository name matches the base path in vite.config.ts
- Check that GitHub Pages is configured to use GitHub Actions as source
- Verify the workflow has proper permissions for Pages deployment

## URLs

- **GitHub Pages**: `https://yourusername.github.io/Extended-Clipboard-Desktop-App/`
- **Repository**: `https://github.com/yourusername/Extended-Clipboard-Desktop-App`

Replace `yourusername` with your actual GitHub username.
