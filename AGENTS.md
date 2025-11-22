# agent.md

## Purpose
Build a local, fully static homepage that loads instantly and provides simple, useful widgets, such as:
- GitLab / Jira status cards (via client-side API calls)
- Quick-access link tiles
- A DuckDuckGo search bar
- Optional small tools (timers, notes, etc.)

No backend, no server process. Everything runs as static HTML/CSS/JS in the browser.

## Tech Stack
- **Vite** – fast bundler; outputs pure static files.
- **TypeScript + React** – modular UI widgets.
- **Tailwind CSS** – fast utility-based styling (with `darkMode: 'class'` and a custom accent palette).
- **v0.dev** – AI-driven generation of UI components.
- **shadcn/ui (optional)** – clean, well-structured components.
- **Fetch API** – direct client-side requests to GitLab APIs.

### Styling Notes
- Light theme uses a soft radial gradient (`from-slate-50 via-white to slate-100`) and cards with translucent white backgrounds + subtle borders.
- Dark theme applies the Tailwind `dark` class on `<html>` and uses `from-slate-950 via-slate-900 to indigo-950` gradients with glassmorphism cards.
- Utility classes keep widgets compact (e.g., `rounded-2xl`, `backdrop-blur`, `border-white/10`) while remaining responsive with flex/grid layouts.
- Quick links default to 8 tiles with a “Show more” toggle; metrics in the GitLab card are clickable and use accent hover states.
- Current layout: hero header (greeting + weather toggle) → merged search/link widget → GitLab focus card (full-width) optimized for a 14" MacBook Pro viewport.

## Output
- `dist/` contains only `index.html`, `*.js`, and `*.css`.
- Works fully local via `file://` or any minimal static host.
