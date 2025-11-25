# agent.md

## Purpose
Build a local, fully static homepage that loads instantly and provides simple, useful widgets, such as:
- GitLab / Jira status cards (via client-side API calls)
- Quick-access link tiles
- A DuckDuckGo search bar
- Optional small tools (timers, notes, etc.)
- Command palette (⌘/Ctrl+K or `/`) that searches bookmarks, GitLab merge requests, and weather commands before falling back to web search.
- Personalization defaults live in `src/config/personalization.example.json`; copy to `.local` for private settings.
- GitLab widget uses `VITE_GITLAB_TOKEN` and optional `VITE_GITLAB_USERNAME`/`VITE_GITLAB_NAMESPACE` env vars to fetch your MRs.

No backend, no server process. Everything runs as static HTML/CSS/JS in the browser.

## Tech Stack
- **Vite** – fast bundler; outputs pure static files.
- **TypeScript + React** – modular UI widgets.
- **Tailwind CSS** – fast utility-based styling (with `darkMode: 'class'` and a custom accent palette).
- **v0.dev** – AI-driven generation of UI components.
- **shadcn/ui (optional)** – clean, well-structured components.
- **Fetch API** – direct client-side requests to GitLab APIs.

### Styling Notes
- Light theme uses a soft radial gradient (`from-slate-50 via-white to slate-100`) and glassmorphism cards (70–90% opacity, 12–18px blur, thin borders).
- Dark theme applies the Tailwind `dark` class on `<html>` and uses `from-slate-950 via-slate-900 to indigo-950` gradients with matching frosted cards.
- Utility classes keep widgets compact (rounded geometry, backdrop blur) while remaining responsive with flex/grid layouts.
- Quick links/bookmarks support categories as tabs; Command Palette surfaces bookmarks and GitLab MRs.
- Current layout: compact header (time/date/greeting + integrated search button with ⌘K hint + weather pill) → GitLab focus card (primary, full-height) → weather + bookmarks column; optimized for mobile-first with enhanced responsiveness.
- Search functionality unified through Command Palette (⌘K or /) - no separate search widget, cleaner UI with more space for GitLab content.

## Output
- `dist/` contains only `index.html`, `*.js`, and `*.css`.
- Works fully local via `file://` or any minimal static host.
