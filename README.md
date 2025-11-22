# Homebase

A zero-backend homepage built with Vite + React + Tailwind. Widgets live entirely on the client:

- DuckDuckGo-first search form with selectable engines.
- GitLab/Jira-style status cards (client-side API calls, paste your PAT to fetch live counts).
- Quick link grid for common destinations.
- Scratch pad (localStorage) and a focus timer.

## Getting Started

```bash
pnpm install # or npm install / yarn
pnpm dev     # runs Vite on http://localhost:5173
pnpm build   # outputs static assets into dist/
```

Drop the `dist/` folder on any static host or run it locally via `file://`.
