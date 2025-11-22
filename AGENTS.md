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
- **Tailwind CSS** – fast utility-based styling.
- **v0.dev** – AI-driven generation of UI components.
- **shadcn/ui (optional)** – clean, well-structured components.
- **Fetch API** – direct client-side requests to GitLab/Jira APIs.

## Output
- `dist/` contains only `index.html`, `*.js`, and `*.css`.
- Works fully local via `file://` or any minimal static host.