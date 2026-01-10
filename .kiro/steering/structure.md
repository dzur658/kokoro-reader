# Project Structure

## Directory Layout
```
kokoro-reader/
├── src/
│   ├── components/          # React components
│   │   ├── Popup.jsx       # Extension popup interface
│   │   ├── VoiceSelector.jsx # Voice selection component
│   │   └── Controls.jsx    # Playback controls
│   ├── content/            # Content scripts
│   │   ├── content.js      # Main content script
│   │   └── text-extractor.js # Text selection utilities
│   ├── background/         # Background scripts
│   │   ├── background.js   # Extension background script
│   │   └── tts-manager.js  # TTS processing logic
│   ├── assets/            # Static assets
│   │   ├── icons/         # Extension icons
│   │   └── styles/        # CSS files
│   └── manifest.json      # Extension manifest
├── public/                # Public assets
├── dist/                  # Built extension files
├── tests/                 # Test files
├── docs/                  # Documentation
├── .kiro/                 # Kiro CLI configuration
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
└── crxjs.config.js        # CRXJS extension config
```

## File Naming Conventions
- **Components**: PascalCase (e.g., `VoiceSelector.jsx`)
- **Utilities**: kebab-case (e.g., `text-extractor.js`)
- **Scripts**: kebab-case (e.g., `background.js`)
- **Styles**: kebab-case (e.g., `popup-styles.css`)
- **Assets**: kebab-case (e.g., `icon-16.png`)

## Module Organization
- **Components**: Reusable React components in `/src/components/`
- **Content Scripts**: Page interaction logic in `/src/content/`
- **Background Scripts**: Extension lifecycle management in `/src/background/`
- **Utilities**: Shared helper functions co-located with usage
- **Assets**: Static resources in `/src/assets/` and `/public/`

## Configuration Files
- **manifest.json**: Extension permissions and metadata
- **vite.config.js**: Build tool configuration with CRXJS plugin
- **package.json**: Dependencies, scripts, and project metadata
- **crxjs.config.js**: Chrome extension specific build settings
- **.kiro/**: Kiro CLI steering documents and prompts

## Documentation Structure
- **README.md**: Project overview and setup instructions
- **DEVLOG.md**: Development timeline and decisions
- **docs/**: Detailed documentation and API references
- **JSDoc comments**: Inline code documentation

## Asset Organization
- **Icons**: Multiple sizes in `/src/assets/icons/` (16x16, 48x48, 128x128)
- **Styles**: Component-specific CSS in `/src/assets/styles/`
- **Audio**: TTS voice files and audio assets (if needed)
- **Images**: UI graphics and screenshots in `/public/`

## Build Artifacts
- **dist/**: Production-ready extension files
- **dist/manifest.json**: Processed extension manifest
- **dist/assets/**: Bundled and optimized assets
- **dist/*.js**: Compiled and minified JavaScript bundles

## Environment-Specific Files
- **Development**: Vite dev server with hot reload
- **Testing**: Chrome extension testing environment
- **Production**: Optimized build for Chrome Web Store
- **Environment variables**: Stored in `.env` files (not committed)
