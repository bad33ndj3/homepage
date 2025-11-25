# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note**: For project purpose, design goals, and vision, see [AGENTS.md](./AGENTS.md).

## Project Overview

Homebase is a futuristic, zero-backend homepage that loads instantly and provides simple, useful widgets. Built as a fully static application with React + Vite + Tailwind CSS, it features:

- **GitLab integration**: Status cards for assigned merge requests, reviewer queue, and recently merged MRs (via client-side API calls)
- **Quick-access link tiles**: Category-based bookmarks with tab navigation
- **Command palette**: (⌘/Ctrl+K or `/`) searches bookmarks, GitLab MRs, and weather commands before falling back to DuckDuckGo web search
- **Weather widget**: With location-based or configured forecast
- **Theme system**: Light/dark modes with glassmorphism design

The entire application runs as static HTML/CSS/JS in the browser—no backend, no server process. Works via `file://` or any static host.

## Tech Stack

- **Vite**: Fast bundler that outputs pure static files to `dist/`
- **TypeScript + React**: Modular UI widgets with type safety
- **Tailwind CSS**: Utility-first styling with `darkMode: 'class'` and custom accent palette
- **Radix UI** (via shadcn/ui pattern): Accessible, well-structured component primitives
- **Fetch API**: Direct client-side requests to GitLab APIs (no backend proxy)

Components were initially generated with AI tools (v0.dev) and then customized for this project's glassmorphism aesthetic.

## Development Commands

### Install dependencies
```bash
pnpm install  # or npm install / yarn
```

### Development server
```bash
pnpm dev  # Starts Vite dev server at http://localhost:5173
```

### Build for production
```bash
pnpm build  # TypeScript compilation + Vite build → dist/
```

### Build self-contained file:// version
```bash
npm run build:inline  # Inlines CSS/JS into dist/index.html for double-click usage
```

The `build:inline` script runs `scripts/inline-embed.js` which embeds all CSS and JS into a single HTML file for offline usage.

### Preview production build
```bash
pnpm preview
```

### Type checking
```bash
tsc -b  # Run TypeScript compiler in build mode
```

## Configuration System

### Environment Variables (.env)
Configuration uses Vite's environment variable system. Copy `.env.example` to `.env`:

- `VITE_GITLAB_TOKEN`: GitLab personal access token (API scope) for merge request data
- `VITE_GITLAB_USERNAME`: Your GitLab username (enables reviewer queue features)
- `VITE_GITLAB_API_URL`: Optional override for GitLab API endpoint
- `VITE_GITLAB_NAMESPACE`: Optional GitLab namespace/project (e.g., `my-group/my-project`)

All environment variables must be prefixed with `VITE_` to be exposed to the client.

### Local Configuration Files (.local.json)
The app uses a `.local.json` pattern for user-specific configuration that should not be committed:

1. **Bookmarks** (`src/config/links.local.json`):
   - Copy from `src/config/links.example.json`
   - Add/edit bookmark links with optional `category` field to create tabs
   - `.local` files are gitignored for privacy

2. **Personalization** (`src/config/personalization.local.json`):
   - Copy from `src/config/personalization.example.json`
   - Set `displayName` for greeting customization
   - Set `weatherLocation` (lat/lon + label) for fixed weather location without geolocation

The config loader pattern (`src/config/links.ts`, `src/config/personalization.ts`) uses `import.meta.glob` to load `.local.json` files if they exist, falling back to `.example.json` files.

## Architecture

### Component Structure

**Main Application Flow**:
- `src/main.tsx` → `src/App.tsx` → widgets and components
- `src/App.tsx` is the root component containing:
  - Header with greeting, clock, and weather pill
  - Command palette system (Cmd/Ctrl+K or `/`)
  - Main content grid with search bar, GitLab status board, weather widget, and bookmarks
  - Settings modal for personalization

**Key Widgets** (domain-specific features):
- `src/widgets/StatusBoard.tsx`: GitLab merge request dashboard with:
  - Assigned MR metrics (open, stale, conflicts, pipeline status)
  - Reviewer queue (if `VITE_GITLAB_USERNAME` is set)
  - Recently merged MRs (expandable section)
  - Highlight cards with expandable details
- `src/widgets/WeatherBadge.tsx`: Weather display with collapsible forecast
- `src/widgets/SearchBar.tsx`: DuckDuckGo search input

**Shared Components**:
- `src/components/CommandPalette.tsx`: Fuzzy search palette for bookmarks, GitLab MRs, weather actions, and web search fallback
- `src/components/SettingsModal.tsx`: Settings dialog
- `src/components/ThemeToggle.tsx`: Dark/light mode switcher
- `src/components/ui/*`: Radix UI-based primitives (button, card, dialog, input, switch, select, badge, label)

### State Management

No external state management library is used. State is managed via:
- React hooks (`useState`, `useEffect`, `useMemo`)
- Custom hooks:
  - `src/hooks/useLocalStorage.ts`: Persistent state in localStorage
  - `src/hooks/useTheme.ts`: Theme preference and system preference detection
  - `src/widgets/useMergedStatus.ts`: Toggle-based data fetching for merged MRs

### GitLab Integration

**Data Flow**:
1. `StatusBoard` component fetches from GitLab API using tokens from env vars
2. `buildGitLabInsights()` transforms API responses into metrics + highlights
3. `buildReviewerInsights()` processes reviewer-specific data with enhanced checks
4. `annotateReviewerHighlights()` makes additional API calls to fetch review state (comments, approvals)

**Key Functions**:
- `buildGitLabFilterUrl()`: Constructs GitLab dashboard URLs with filters for assigned MRs
- `buildGitLabReviewerFilterUrl()`: Constructs GitLab dashboard URLs for reviewer queue
- `buildDefaultGitLabApiUrl()`: Generates GitLab API endpoint URLs with query params
- Review categorization: `getReviewCategory()` determines "needs-review", "in-review", or "reviewed" status

**Important**: The reviewer queue requires `VITE_GITLAB_USERNAME` to be set. Without it, the user sees a warning to configure it.

### Styling

**Design System**:
- **Light theme**: Soft radial gradients (`from-slate-50 via-white to slate-100`) with glassmorphism cards at 60-70% opacity, 12-24px backdrop blur, and thin borders (`border-white/45`)
- **Dark theme**: Applied via `.dark` class on `<html>`, uses `from-slate-950 via-slate-900 to indigo-950` gradients with matching frosted cards (`border-white/10`, `bg-white/5`)
- **Glassmorphism pattern**: Rounded geometry (12-20px), backdrop blur, semi-transparent backgrounds with subtle borders
- **Color palette**: Slate tones for neutrals, `#3A7AFE` for accent blue, gradient overlays for depth
- **Theme management**: `useTheme` hook manages preference (light/dark/system), syncs with system preference via media query
- **Responsive layouts**: Flex/grid layouts optimized for 14" MacBook Pro viewport, adapts to mobile with mobile-first approach

**Current Layout**:
- Slim top bar: time/date/greeting + prominent clock + weather pill (clickable to expand)
- Main grid: search bar + GitLab status board | weather widget + bookmarks column
- Bookmarks support category tabs; Command Palette surfaces all bookmarks and GitLab MRs for quick access

### Path Aliases

TypeScript and Vite are configured with `@/*` alias pointing to `src/*`:
```typescript
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage';
```

## Testing & Quality

This project does not include automated tests. When adding features:
- Manually test light/dark mode switching
- Test command palette (Cmd/Ctrl+K and `/`)
- Verify GitLab integration with and without tokens
- Test `build:inline` for file:// compatibility

## Common Patterns

### Adding a New Bookmark Category
1. Edit `src/config/links.local.json` (or create from example)
2. Add `"category": "CategoryName"` to link objects
3. The app automatically creates tabs in the Bookmarks card

### Adding New Command Palette Items
In `src/App.tsx`, add items to the `commandItems` array in the `useMemo` hook (around line 230). Each item needs:
- `id`: unique identifier
- `label`: display name
- `description`: optional subtitle
- `href`: external link OR `action`: callback function
- `keywords`: optional search terms

### Fetching External Data
Follow the pattern in `StatusBoard.tsx`:
1. Define state with `useState`
2. Fetch in `useEffect` with cleanup (`cancelled` flag)
3. Transform data before setting state
4. Handle loading and error states

### Styling Glassmorphism Components
Standard pattern:
```typescript
className="rounded-[16px] border border-white/45 bg-white/60
  shadow-[0_20px_55px_rgba(15,23,42,0.16)] backdrop-blur-2xl
  dark:border-white/10 dark:bg-white/5"
```

## Notes

- The app is designed to work without a backend; all API calls are client-side using the Fetch API
- GitLab tokens are stored in environment variables (not committed to version control)
- User-specific config (bookmarks, personalization) uses `.local.json` files (gitignored for privacy)
- The `build:inline` process uses base64 encoding for ES modules to support file:// protocol
- Weather location uses browser geolocation API or configured static coordinates
- Build output in `dist/` contains only `index.html`, `*.js`, and `*.css` files—fully static and portable
- Optimized for 14" MacBook Pro viewport but responsive to all screen sizes
