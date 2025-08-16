#!/bin/bash

# Extended Clipboard Release Upload Script
# This script helps prepare release assets for GitHub upload

set -e

VERSION="0.1.0"
RELEASE_DIR="./release"

echo "🚀 Extended Clipboard v${VERSION} Release Asset Preparation"
echo "============================================================"

# Check if release directory exists
if [ ! -d "$RELEASE_DIR" ]; then
    echo "❌ Release directory not found. Please run 'npm run dist' first."
    exit 1
fi

# Create a clean release assets directory
ASSETS_DIR="./release-assets"
rm -rf "$ASSETS_DIR"
mkdir -p "$ASSETS_DIR"

echo "📦 Copying release assets to ${ASSETS_DIR}..."

# Copy main distribution files (not the unpacked directories)
cp "$RELEASE_DIR/Extended Clipboard-${VERSION}.dmg" "$ASSETS_DIR/" 2>/dev/null || echo "⚠️  Intel DMG not found"
cp "$RELEASE_DIR/Extended Clipboard-${VERSION}-arm64.dmg" "$ASSETS_DIR/" 2>/dev/null || echo "⚠️  ARM64 DMG not found"
cp "$RELEASE_DIR/Extended Clipboard-${VERSION}-mac.zip" "$ASSETS_DIR/" 2>/dev/null || echo "⚠️  Intel ZIP not found"
cp "$RELEASE_DIR/Extended Clipboard-${VERSION}-arm64-mac.zip" "$ASSETS_DIR/" 2>/dev/null || echo "⚠️  ARM64 ZIP not found"
cp "$RELEASE_DIR/Extended Clipboard Setup ${VERSION}.exe" "$ASSETS_DIR/" 2>/dev/null || echo "⚠️  Windows installer not found"
cp "$RELEASE_DIR/Extended Clipboard ${VERSION}.exe" "$ASSETS_DIR/" 2>/dev/null || echo "⚠️  Windows portable not found"
cp "$RELEASE_DIR/Extended Clipboard-${VERSION}.AppImage" "$ASSETS_DIR/" 2>/dev/null || echo "⚠️  Linux AppImage not found"
cp "$RELEASE_DIR/extended-clipboard_${VERSION}_amd64.deb" "$ASSETS_DIR/" 2>/dev/null || echo "⚠️  Linux DEB not found"

echo ""
echo "✅ Release assets prepared in ${ASSETS_DIR}:"
ls -lh "$ASSETS_DIR"

echo ""
echo "📋 Next Steps:"
echo "1. Go to https://github.com/DJFreer92/Extended-Clipboard-Desktop-App/releases"
echo "2. Click 'Create a new release'"
echo "3. Choose the existing tag 'v${VERSION}'"
echo "4. Add release title: 'Extended Clipboard v${VERSION}'"
echo "5. Add release description (copy from tag message or README)"
echo "6. Upload all files from the ${ASSETS_DIR} directory"
echo "7. Click 'Publish release'"

echo ""
echo "📁 Asset Files Summary:"
echo "• Extended Clipboard-${VERSION}.dmg - macOS Intel installer"
echo "• Extended Clipboard-${VERSION}-arm64.dmg - macOS Apple Silicon installer"
echo "• Extended Clipboard-${VERSION}-mac.zip - macOS Intel portable"
echo "• Extended Clipboard-${VERSION}-arm64-mac.zip - macOS Apple Silicon portable"
echo "• Extended Clipboard Setup ${VERSION}.exe - Windows installer"
echo "• Extended Clipboard ${VERSION}.exe - Windows portable"
echo "• Extended Clipboard-${VERSION}.AppImage - Linux portable"
echo "• extended-clipboard_${VERSION}_amd64.deb - Linux DEB package"

echo ""
echo "🎉 Ready for GitHub Release!"
