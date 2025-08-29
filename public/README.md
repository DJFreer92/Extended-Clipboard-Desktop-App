# Extended Clipboard - GitHub Pages Setup

This directory contains static assets for the GitHub Pages deployment of Extended Clipboard.

## Required Assets

You'll need to add the following files to this directory for the web deployment:

- `favicon-16x16.png` - 16x16 favicon
- `favicon-32x32.png` - 32x32 favicon
- `apple-touch-icon.png` - 180x180 Apple touch icon
- `icon-192x192.png` - 192x192 PWA icon
- `icon-512x512.png` - 512x512 PWA icon

## Creating Icons

You can create these from your existing app icon at:
`src/assets/app_icon/Extended Clipboard_App_Icon.png`

### Using ImageMagick (if installed)

```bash
# From your project root
convert "src/assets/app_icon/Extended Clipboard_App_Icon.png" -resize 16x16 public/favicon-16x16.png
convert "src/assets/app_icon/Extended Clipboard_App_Icon.png" -resize 32x32 public/favicon-32x32.png
convert "src/assets/app_icon/Extended Clipboard_App_Icon.png" -resize 180x180 public/apple-touch-icon.png
convert "src/assets/app_icon/Extended Clipboard_App_Icon.png" -resize 192x192 public/icon-192x192.png
convert "src/assets/app_icon/Extended Clipboard_App_Icon.png" -resize 512x512 public/icon-512x512.png
```

### Using Online Tools

- [Favicon.io](https://favicon.io/) - Convert images to favicons
- [PWA Icon Generator](https://www.pwabuilder.com/imageGenerator) - Generate PWA icons
