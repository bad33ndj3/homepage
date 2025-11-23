# Homebase

Futuristic, zero-backend homepage: instant load, glassmorphism, dark/light, and a command palette that finds bookmarks, merge requests, weather actions, or jumps to web search. Everything is static—works via `file://` or any static host.

## Why you’ll like it
- Cmd/Ctrl+K or `/` to command everything (bookmarks, GitLab MRs, weather, web search).
- GitLab focus: stale/conflict/pipeline metrics plus expandable MR details.
- Weather: quick summary, rain alerts <1h, optional detailed view.
- Bookmarks with category tabs (work/personal/news, etc.).
- No server. Pure Vite + React + Tailwind output in `dist/`.

## Fast setup
```bash
pnpm install    # or npm install / yarn
pnpm dev        # http://localhost:5173
pnpm build      # emits dist/ for file:// or static hosting
```

Minimal config:
- `.env` from `.env.example` and add `VITE_GITLAB_TOKEN` (optional `VITE_GITLAB_NAMESPACE`).
- `src/config/links.json`: edit bookmarks; add `"category": "Work"` to make a tab.
- `src/config/personalization.json`: set `displayName` for the greeting (also editable in Settings ⚙️).

For a fully self-contained `file://` build, run:
```bash
npm run build:inline
```
This inlines CSS/JS into `dist/index.html` so you can double-click it without a server. Otherwise, use `pnpm build` and serve `dist/` with any static host.

That’s it—open the page and hit Cmd/Ctrl+K.
