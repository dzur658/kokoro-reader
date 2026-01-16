#!/bin/bash

# Validation script for Kokoro Reader Chrome Extension

echo "🔍 Validating Kokoro Reader Extension..."
echo

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ dist/ directory not found. Run 'npm run build' first."
    exit 1
fi

echo "✅ dist/ directory exists"

# Check manifest.json
if [ ! -f "dist/manifest.json" ]; then
    echo "❌ manifest.json not found in dist/"
    exit 1
fi

echo "✅ manifest.json exists"

# Check required files
required_files=(
    "dist/service-worker-loader.js"
    "dist/src/popup/index.html"
    "dist/src/display/index.html"
    "dist/src/assets/icons/kokoro_reader_16.png"
    "dist/src/assets/icons/kokoro_reader_48.png"
    "dist/src/assets/icons/kokoro_reader_128.png"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Required file missing: $file"
        exit 1
    fi
    echo "✅ $file exists"
done

# Check for content script bundle
if ls dist/assets/content.ts-*.js 1> /dev/null 2>&1; then
    echo "✅ Content script bundle exists"
else
    echo "❌ Content script bundle not found"
    exit 1
fi

# Check for background script bundle
if ls dist/assets/background.ts-*.js 1> /dev/null 2>&1; then
    echo "✅ Background script bundle exists"
else
    echo "❌ Background script bundle not found"
    exit 1
fi

# Check manifest structure
echo
echo "📋 Manifest validation:"
if grep -q '"manifest_version": 3' dist/manifest.json; then
    echo "✅ Manifest V3 format"
else
    echo "❌ Not using Manifest V3"
    exit 1
fi

if grep -q '"activeTab"' dist/manifest.json; then
    echo "✅ activeTab permission present"
else
    echo "❌ activeTab permission missing"
    exit 1
fi

if grep -q '"storage"' dist/manifest.json; then
    echo "✅ storage permission present"
else
    echo "❌ storage permission missing"
    exit 1
fi

echo
echo "🎉 Extension validation completed successfully!"
echo
echo "📝 Next steps:"
echo "1. Open Chrome and navigate to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked' and select the 'dist/' directory"
echo "4. Test the extension on a webpage with readable content"
echo
echo "🧪 Recommended test sites:"
echo "- https://www.bbc.com/news (news articles)"
echo "- https://medium.com (blog posts)"
echo "- https://developer.mozilla.org (documentation)"
