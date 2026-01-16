# Kokoro Reader - Chrome Extension

A Chrome browser extension that extracts readable content from web pages using Mozilla's Readability library, preparing content for future text-to-speech processing with Kokoro TTS.

## Features

- **Content Extraction**: Uses @mozilla/readability to extract clean, readable content from any webpage
- **Clean Display**: Shows extracted content in a new tab with readable formatting
- **Universal Compatibility**: Works on any website with text content
- **Minimal Permissions**: Only requires activeTab and storage permissions

## Installation & Testing

### Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Build Extension**:
   ```bash
   npm run build
   ```

3. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist/` directory from this project

### Usage

1. **Navigate to any webpage** with readable content (news articles, blog posts, documentation)
2. **Click the Kokoro Reader extension icon** in the Chrome toolbar
3. **Click "Extract Content"** in the popup
4. **View extracted content** in the new tab that opens

### Testing Websites

Try the extension on these types of content:
- News articles (CNN, BBC, Reuters)
- Blog posts (Medium, personal blogs)
- Documentation (MDN, GitHub README files)
- Academic papers and articles

## Project Structure

```
kokoro-reader/
├── src/
│   ├── background/         # Background service worker
│   ├── content/           # Content script with readability integration
│   ├── popup/             # Extension popup interface
│   ├── display/           # Content display page
│   └── assets/icons/      # Extension icons
├── dist/                  # Built extension files
├── manifest.json          # Extension manifest (Manifest V3)
├── vite.config.js         # Vite build configuration
└── package.json           # Dependencies and scripts
```

## Technical Details

- **Frontend Framework**: React 18 with TypeScript
- **Manifest Version**: 3 (latest Chrome extension standard)
- **Build Tool**: Vite with CRXJS plugin and @vitejs/plugin-react
- **Content Extraction**: @mozilla/readability library
- **Security**: DOMPurify for HTML sanitization
- **Permissions**: activeTab (for content access), storage (for temporary data)

## Development

### Build Commands

```bash
npm run dev     # Development server (for testing)
npm run build   # Production build
npm run preview # Preview built extension
```

### Architecture

1. **Popup** (`src/popup/`) - React-based user interface for triggering content extraction
2. **Content Script** (`src/content/`) - Injected into web pages to extract content using Readability
3. **Background Script** (`src/background/`) - Manages extension lifecycle and tab creation
4. **Display Page** (`src/display/`) - React component that shows extracted content in a clean, readable format

## Future Enhancements

This initial scaffolding sets the foundation for:
- Kokoro TTS integration for high-quality text-to-speech
- Voice selection and audio controls
- Playback controls (play, pause, stop)
- Text highlighting during speech
- Voice customization options

## Troubleshooting

### Extension Won't Load
- Ensure you've run `npm run build` first
- Check that you're loading the `dist/` directory, not the root project directory
- Verify Developer mode is enabled in Chrome extensions

### Content Extraction Fails
- Check browser console for errors
- Ensure the webpage has readable content (some pages may not work well with Readability)
- Try refreshing the page and attempting extraction again

### Build Errors
- Ensure Node.js and npm are installed
- Run `npm install` to install dependencies
- Check that all source files are present and properly formatted

## License

MIT License - see LICENSE file for details.
