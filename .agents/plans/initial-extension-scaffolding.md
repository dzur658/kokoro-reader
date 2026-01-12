# Feature: Initial Extension Scaffolding with Readability Integration

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Create the foundational Chrome extension structure using Vite + CRXJS with @mozilla/readability integration. The extension will extract readable content from web pages and display it in a new tab as HTML, demonstrating the text extraction capability that will eventually feed into the Kokoro TTS system.

## User Story

As a web user
I want to extract readable content from any webpage and view it in a clean format
So that I can prepare text content for future text-to-speech processing

## Problem Statement

The Kokoro Reader project needs a foundational Chrome extension that can extract clean, readable text from web pages. This extracted content will eventually be processed by Kokoro TTS, but first we need to demonstrate the ability to extract and display readable content from any webpage.

## Solution Statement

Build a Manifest V3 Chrome extension using modern tooling (Vite + CRXJS) that includes a content script to extract page content with @mozilla/readability and display the extracted content in a new HTML tab for validation and demonstration purposes.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: Chrome Extension Infrastructure, Content Extraction, Tab Management
**Dependencies**: @mozilla/readability, @crxjs/vite-plugin, vite

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.kiro/steering/product.md` - Why: Contains product vision and target users for Kokoro Reader
- `.kiro/steering/tech.md` - Why: Defines technology stack (React, Vite, CRXJS, Chrome Manifest V3)
- `.kiro/steering/structure.md` - Why: Defines file organization and naming conventions
- `.kiro/agents/ExtensionDev.json` - Why: Shows specialized agent configuration for Chrome extension development

### New Files to Create

- `package.json` - Project dependencies and scripts
- `vite.config.js` - Vite configuration with CRXJS plugin
- `manifest.json` - Chrome extension manifest (Manifest V3)
- `src/content/content.js` - Content script for text extraction
- `src/background/background.js` - Background service worker
- `src/popup/popup.html` - Extension popup interface
- `src/popup/popup.js` - Popup functionality
- `src/display/display.html` - Template for displaying extracted content
- `src/display/display.js` - Display page functionality
- `src/assets/icons/` - Extension icons (16x16, 48x48, 128x128)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Mozilla Readability GitHub](https://github.com/mozilla/readability)
  - Specific section: Basic usage and API reference
  - Why: Required for implementing content extraction functionality
- [CRXJS Manifest Documentation](https://crxjs.dev/concepts/manifest)
  - Specific section: Manifest configuration and path resolution
  - Why: Shows proper Vite + CRXJS setup patterns
- [Chrome Extension Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
  - Specific section: Manifest V3 content script configuration
  - Why: Required for injecting readability extraction into web pages

### Patterns to Follow

**Naming Conventions:**
- Components: PascalCase (e.g., `VoiceSelector.jsx`)
- Utilities: kebab-case (e.g., `text-extractor.js`)
- Scripts: kebab-case (e.g., `background.js`)
- Assets: kebab-case (e.g., `icon-16.png`)

**File Organization:**
- Content scripts in `/src/content/`
- Background scripts in `/src/background/`
- Popup components in `/src/popup/`
- Assets in `/src/assets/`

**Chrome Extension Patterns:**
- Manifest V3 service workers (not background pages)
- Content script injection for DOM access
- Message passing between contexts
- Minimal permissions (activeTab, storage)

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation Setup

Set up the basic project structure with Vite, CRXJS, and necessary dependencies for Chrome extension development.

**Tasks:**
- Initialize npm project with package.json
- Configure Vite with CRXJS plugin for Chrome extension builds
- Create basic Manifest V3 configuration
- Set up project directory structure following steering guidelines

### Phase 2: Core Extension Infrastructure

Implement the basic Chrome extension components including manifest, background script, and popup interface.

**Tasks:**
- Create Manifest V3 configuration with required permissions
- Implement background service worker for extension lifecycle
- Create basic popup HTML and JavaScript
- Add extension icons and assets

### Phase 3: Content Extraction Implementation

Integrate @mozilla/readability for content extraction and implement content script injection.

**Tasks:**
- Install and configure @mozilla/readability dependency
- Create content script for DOM access and text extraction
- Implement readability parsing and content extraction
- Add message passing between content script and background

### Phase 4: Content Display System

Create the display mechanism to show extracted content in a new tab.

**Tasks:**
- Create HTML template for displaying extracted content
- Implement tab creation and content injection
- Add styling for readable content display
- Connect extraction workflow to display system

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE package.json

- **IMPLEMENT**: Initialize npm project with Chrome extension dependencies
- **PATTERN**: Standard Node.js project structure
- **IMPORTS**: @mozilla/readability, @crxjs/vite-plugin, vite
- **GOTCHA**: Use exact versions for stability, include extension-specific scripts
- **VALIDATE**: `npm install && npm list`

### CREATE vite.config.js

- **IMPLEMENT**: Configure Vite with CRXJS plugin for Chrome extension builds
- **PATTERN**: CRXJS configuration with manifest path resolution
- **IMPORTS**: @crxjs/vite-plugin, defineConfig from vite
- **GOTCHA**: Ensure proper path resolution for extension assets
- **VALIDATE**: `npm run build` (should create dist/ directory)

### CREATE manifest.json

- **IMPLEMENT**: Manifest V3 configuration with content scripts and permissions
- **PATTERN**: Minimal permissions approach (activeTab, storage)
- **IMPORTS**: None (JSON configuration)
- **GOTCHA**: Use Manifest V3 format, avoid deprecated V2 features
- **VALIDATE**: Chrome extension validation (load unpacked in chrome://extensions/)

### CREATE src/assets/icons/

- **IMPLEMENT**: Extension icons in required sizes (16x16, 48x48, 128x128)
- **PATTERN**: Standard Chrome extension icon requirements
- **IMPORTS**: None (static assets)
- **GOTCHA**: Icons must be PNG format, proper sizes for different contexts
- **VALIDATE**: Visual inspection and manifest validation

### CREATE src/background/background.js

- **IMPLEMENT**: Service worker for extension lifecycle management
- **PATTERN**: Manifest V3 service worker (not background page)
- **IMPORTS**: Chrome extension APIs
- **GOTCHA**: Service workers have different lifecycle than background pages
- **VALIDATE**: `chrome.runtime.onInstalled` event fires in extension console

### CREATE src/popup/popup.html

- **IMPLEMENT**: Basic popup interface with extract button
- **PATTERN**: Simple HTML with inline CSS, minimal UI
- **IMPORTS**: popup.js script reference
- **GOTCHA**: Keep popup lightweight, avoid external resources
- **VALIDATE**: Popup opens when clicking extension icon

### CREATE src/popup/popup.js

- **IMPLEMENT**: Popup functionality to trigger content extraction
- **PATTERN**: Event listeners and Chrome API message passing
- **IMPORTS**: Chrome extension APIs
- **GOTCHA**: Popup context is separate from content script context
- **VALIDATE**: Button click sends message to content script

### CREATE src/content/content.js

- **IMPLEMENT**: Content script with @mozilla/readability integration
- **PATTERN**: DOM access and readability parsing
- **IMPORTS**: @mozilla/readability (Readability class)
- **GOTCHA**: Content script runs in isolated context, clone document for parsing
- **VALIDATE**: `console.log` shows extracted content in page console

### CREATE src/display/display.html

- **IMPLEMENT**: Template for displaying extracted readable content
- **PATTERN**: Clean, readable HTML structure with CSS styling
- **IMPORTS**: display.js script reference
- **GOTCHA**: Style for readability, avoid conflicts with injected content
- **VALIDATE**: HTML validates and displays sample content correctly

### CREATE src/display/display.js

- **IMPLEMENT**: Display page functionality to receive and show extracted content
- **PATTERN**: URL parameter parsing or message passing for content data
- **IMPORTS**: None (vanilla JavaScript)
- **GOTCHA**: Handle large content efficiently, sanitize HTML if needed
- **VALIDATE**: Display page shows extracted content from test webpage

### UPDATE manifest.json

- **IMPLEMENT**: Add content script registration and display page declaration
- **PATTERN**: Content script matches and display page web_accessible_resources
- **IMPORTS**: None (JSON configuration)
- **GOTCHA**: Ensure proper URL patterns and resource accessibility
- **VALIDATE**: Content script injects on target pages, display page accessible

### ADD Integration Workflow

- **IMPLEMENT**: Connect popup → content script → background → display page workflow
- **PATTERN**: Chrome extension message passing between contexts
- **IMPORTS**: Chrome extension messaging APIs
- **GOTCHA**: Handle async operations and error states properly
- **VALIDATE**: Full workflow from popup click to content display works

---

## TESTING STRATEGY

### Unit Tests

Not applicable for initial scaffolding - focus on functional testing through Chrome extension development tools.

### Integration Tests

Test the complete workflow using Chrome extension development environment:
- Load unpacked extension in chrome://extensions/
- Test on various websites (news articles, blog posts, documentation)
- Verify content extraction quality and display formatting

### Edge Cases

- Pages with minimal content (should handle gracefully)
- Pages with complex layouts (readability should extract main content)
- Pages with JavaScript-heavy content (ensure DOM is ready)
- Large articles (performance and memory considerations)

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run build  # Vite build should complete without errors
```

### Level 2: Extension Validation

```bash
# Load unpacked extension in Chrome
# Navigate to chrome://extensions/
# Enable Developer mode
# Click "Load unpacked" and select dist/ directory
```

### Level 3: Functional Testing

```bash
# Manual testing workflow:
# 1. Click extension icon to open popup
# 2. Click "Extract Content" button
# 3. Verify new tab opens with extracted content
# 4. Test on multiple websites
```

### Level 4: Content Quality Validation

```bash
# Test readability extraction on:
# - News articles (CNN, BBC, etc.)
# - Blog posts (Medium, personal blogs)
# - Documentation pages (MDN, GitHub README)
# - Verify extracted content is clean and readable
```

---

## ACCEPTANCE CRITERIA

- [ ] Chrome extension loads successfully in development mode
- [ ] Extension popup opens and displays extract button
- [ ] Content script successfully extracts readable content using @mozilla/readability
- [ ] Extracted content displays in new tab with clean formatting
- [ ] Extension works on diverse websites (news, blogs, documentation)
- [ ] No console errors in extension contexts (popup, content, background)
- [ ] Extension follows Manifest V3 standards and best practices
- [ ] Code follows project naming conventions and structure guidelines
- [ ] Build process creates distributable extension package
- [ ] Extension demonstrates text extraction capability for future TTS integration

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Extension loads without errors in Chrome
- [ ] Popup interface functional and responsive
- [ ] Content extraction works on test websites
- [ ] Display page shows formatted extracted content
- [ ] No console errors or warnings
- [ ] Build process creates clean dist/ directory
- [ ] Extension ready for next phase (TTS integration)

---

## NOTES

**Design Decisions:**
- Using @mozilla/readability for proven content extraction quality
- Manifest V3 for future-proofing and Chrome Web Store compliance
- Vite + CRXJS for modern development experience with hot reload
- Minimal permissions approach for user trust and security

**Future Considerations:**
- Content will be passed to Kokoro TTS in subsequent features
- Display mechanism can be enhanced with playback controls
- Extension can be extended with voice selection and audio controls

**Performance Considerations:**
- Clone document before readability parsing to avoid DOM modification
- Handle large articles efficiently in display page
- Consider content size limits for message passing between contexts
