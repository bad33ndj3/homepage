# Homebase

A zero-backend, glassy dashboard built with Vite + React + Tailwind. Widgets live entirely on the client:

- Command Palette (⌘/Ctrl+K or `/`): search bookmarks, merge requests, weather commands, and fall back to web search.
- DuckDuckGo-first search form with selectable engines.
- GitLab focus card (client-side API calls; paste your PAT to fetch live counts, conflicts, stale MRs).
- Weather card with optional detailed view and rain alerts.
- Bookmarks grid with category tabs (edit `src/config/links.json`, add `"category"` to group tabs).

## Getting Started

```bash
pnpm install # or npm install / yarn
pnpm dev     # runs Vite on http://localhost:5173
pnpm build   # outputs static assets into dist/
```

Drop the `dist/` folder on any static host or run it locally via `file://`.

## Configuration

- Duplicate `.env.example` into `.env` and add your GitLab API token. Optional: set `VITE_GITLAB_NAMESPACE` so filtered metric links open directly in your workspace. Vite exposes variables prefixed with `VITE_`.
- Update `src/config/links.json` to customize bookmarks. Add `"category": "Work"` (or any label) to have it appear as a tab in the Bookmarks card.
- In Settings (⚙️), set your display name for the greeting and toggle detailed weather.
- Command Palette pulls: bookmarks, GitLab merge requests (top highlights), weather commands, and web-search fallback.
