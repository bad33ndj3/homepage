# Homebase

A zero-backend homepage built with Vite + React + Tailwind. Widgets live entirely on the client:

- DuckDuckGo-first search form with selectable engines.
- GitLab/Jira-style status cards (client-side API calls, paste your PAT to fetch live counts).
- Quick link grid for common destinations (edit `src/config/links.json` to personalize).
- (Optional) Weather + status widgets powered by client-side APIs.

## Getting Started

```bash
pnpm install # or npm install / yarn
pnpm dev     # runs Vite on http://localhost:5173
pnpm build   # outputs static assets into dist/
```

Drop the `dist/` folder on any static host or run it locally via `file://`.

## Configuration

- Duplicate `.env.example` into `.env` and add your GitLab API token. Optional: set `VITE_GITLAB_NAMESPACE` so filtered metric links open directly in your workspace. Vite exposes variables prefixed with `VITE_`.
- Update `src/config/links.json` to customize quick links.
