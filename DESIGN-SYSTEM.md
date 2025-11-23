# Arctic Future Design Book

A cold, minimal, futuristic visual identity designed for a personal productivity homepage. Focused purely on design principles—no implementation details.

---

## 1. Visual Identity Overview

The Arctic Future theme is defined by:

- A cold, crisp color palette.
- Clean, minimal surfaces with frosted glass layers.
- Subtle futuristic accents.
- Strong visual hierarchy through spacing and type.
- Rounded geometry that feels modern but not playful.
- A three-part hero (greeting, clock, weather) sitting on a shared frosted shell.
- Command palette and cards share the same frosted shell for cohesion.

The goal is a dashboard that feels fast, calm, and intentional.

---

## 2. Color System

### Light Mode

- Background: `#F7F9FC`
- Card Background: `#FFFFFF` over a frosted layer (glass blur 12–18px, 70–90% opacity)
- Primary Accent (Cyber Blue): `#3A7AFE`
- Accent Light: `#E6F0FF`
- Text Primary: `#0F172A`
- Text Secondary: `#475569`
- Text Muted: `#94A3B8`
- Border: `#E2E8F0`
- Divider: `#E5E7EB`

**Statuses**

- Info: `#0EA5E9`
- Success: `#10B981`
- Warning: `#F59E0B`
- Error: `#EF4444`
- Rain alert strip: `#E6F0FF` with `#3B82F6` text.

### Dark Mode

- Background: `#0F172A`
- Card Background: `#1E293B` over a frosted layer (glass blur 12–18px, 75–85% opacity)
- Primary Accent (Cyber Blue): `#3A7AFE`
- Accent Dimmed: `#1E3A8A`
- Text Primary: `#F1F5F9`
- Text Secondary: `#CBD5E1`
- Text Muted: `#64748B`
- Border: `#334155`
- Divider: `#1F2A37`

Statuses: Same hues as light mode, adjusted for darkness.

### Weather Colors

Used subtly for small indicators:

- Cold: `#60A5FA`
- Rain: `#3B82F6`
- Cloud: `#CBD5E1` (light) / `#475569` (dark)

---

## 3. Geometry & Shape Language

- Card Radius: `14px`
- Hero Shell Radius (large panels): `20px`
- Input Radius: `10px`
- Button Radius: `999px` for pills (e.g., Settings, weather pill), `8px` for standard buttons.
- Pill Radius: `14px`
- Frosted edges stay crisp; avoid overly soft rounding.

Rounded, but not soft or playful—precise, modern curvature.

---

## 4. Typography

A crisp, futuristic type system using Inter or SF Pro.

### Type Sizes

- Hero Time (HH:MM): `clamp(48px, 10vw, 72px)`
- Hero Seconds (SS): ~60–70% of HH:MM size, aligned on baseline with a small gap.
- Weather Temperature: `24–26px`
- Card Titles: `18–20px`
- Body: `15–16px`
- Muted Meta: `13px`

### Weights

- Bold: Only for the main time and rare emphasis.
- Medium: Card titles and key numbers.
- Regular: Body text.
- Light: Secondary details and meta.

Minimal contrast in fonts; hierarchy comes from size, weight, and spacing—not many font changes.

---

## 5. Spacing System

Consistent scale for a futuristic minimal feel:

`4, 8, 12, 16, 20, 24, 32`

- Cards: `20px` internal padding.
- Section spacing: `24–32px` between major blocks.
- Grid gaps: `16–20px` between cards.
- Dense elements: `12px` (e.g., pill contents, badges).

Whitespace is deliberate and functional. The homepage should never feel cramped; time and weather in particular need generous vertical breathing room.

---

## 6. Layout & Hero Structure

### Overall Grid

On desktop:

- Use a three-column mental model: left (search & GitLab focus), center hero, right (weather + bookmarks).
- Grid gutters follow the 16–20px spacing scale.
- Cards align vertically to create clean columns.

### Hero Shell

The hero is a single frosted panel subdivided into three columns:

- Left: Greeting + date.
- Center: Large digital clock.
- Right: Weather summary pill.

Approximate width distribution on desktop:

- Left column: ~30%
- Center column: ~40%
- Right column: ~30%

All three sections should be vertically aligned so their centers line up within the hero shell.

### Greeting (Left)

- Shows a friendly but minimal greeting and the full date.
- Left-aligned text.
- Greeting uses medium weight; date is lighter, with slightly increased letter spacing.

### Clock (Center)

- Pure digital time, no overlapping shapes.
- Format: `HH:MM` as the dominant element, with seconds `SS` smaller and visually secondary.
- Seconds sit to the right of the minutes with an 8–12px gap, aligned on the baseline.
- There is generous whitespace above and below the digits; the entire block is centered within the middle column.
- Seconds may pulse or gently translate by 1–2px to indicate ticking, but motion remains subtle.
- No labels like “LOCAL TIME”. If a hint is ever needed, use a very small meta line above or below the hero, not attached to the digits.

### Optional Analogue Hint

If an analogue cue is used, it must be:

- A very faint partial bottom arc behind the digits.
- Opacity 5–8% only.
- Positioned so it never touches or crosses the numbers.
- Free of any text (no labels around the arc).

If in doubt, prefer a completely clean digital clock with no analogue markings.

### Weather Summary (Right)

The hero’s weather summary acts as a glassy, interactive pill:

- Glass card with `16px` radius on the outer pill.
- Content stacked vertically with small gaps.
- Always shows three text lines:
  - **Primary line**: `Location · Temperature` (e.g., `Rotterdam · 2°`).
  - **Secondary line**: Short description (e.g., `Overcast`, `Rain around 3:00`).
  - **Tertiary line**: Tiny uppercase hint text:
    - When data is loaded: `Tap to expand detailed view`.
    - When waiting for permission or config: `Tap to allow location or configure coordinates`.
- Weather icon is small and understated; temperature is the main visual weight.
- The pill visually responds on hover/press (slight lift, border accent), but does not radically change its shape or color.

---

## 7. Key Components

### Cards

- Frosted glass surfaces with 12–18px blur and 70–90% opacity.
- Thin borders (light: `#E2E8F0`; dark: `#334155`) with optional subtle inner stroke.
- Soft elevation shadow:
  - Light: `0 12px 35px rgba(15, 23, 42, 0.12)`
  - Dark: `0 12px 35px rgba(0, 0, 0, 0.25)`
- Internal padding: `20px` by default.
- Cards use rounded corners consistent with the global geometry section.

### Search Input & Search Section

- Search input sits inside a frosted card that shares the hero’s shell language.
- Input has minimal border and a soft blue focus ring.
- Search layout:
  - Top row: Search engine selector, input, primary action button.
  - Below: Pinned links grid with equal-sized pills.
- Pinned links use compact frosted pills with thin borders and minimal shadow; they should feel clickable but not heavy.

### Bookmarks & Categories

- Bookmarks card uses tabs (Work / Personal / News, etc.) that are text-first with a subtle accent underline or background.
- Individual bookmark cards visually match the pinned link style for consistency.
- Spacing inside bookmarks mirrors other cards: 16–20px vertical gaps.

### GitLab Focus

- Emphasizes a small number of high-signal metrics: open, stale, failing pipelines, conflicts.
- Uses small badges and labels to indicate status.
- Rows are frosted with hover lift and accent border on focus.
- A secondary “Recently merged” section may appear **below** the main GitLab card:
  - Title: “Recently merged”.
  - Description: short meta line (e.g., “Peek at wins from the last 14 days.”).
  - Optional pill with the merged count, styled as a small stats card.
  - Highlight list reuses the standard highlight row pattern (title, branches, badges).
- The merged section is opt-in: surfaced behind a button that reveals or hides it; it should not clutter the primary focus surface.

### Settings Entry

- Settings is not part of the hero.
- Use a small, outlined pill button labelled “Settings”.
- Place it near the bookmarks / personal tools area, typically bottom-right of that column.
- Visual style follows other pill buttons: ghost/outline, rounded-full, soft shadow, accent on hover.

---

## 8. Weather & Location Behavior (Design Perspective)

- The hero weather summary should always display something meaningful, even while loading:
  - Use a generic location label like “Your area” when precise location is unknown.
  - Use placeholder temperature `—°` if data is not yet available.
  - Secondary/tertiary lines clearly explain what will happen on tap (e.g., allow location, open details).
- When a static, configured location exists, its label is preferred visually over browser-derived names.
- Detailed weather views (opened from the pill) re-use the same color and typography rules and should not introduce heavy imagery.

---

## 9. Motion Principles

- Fast transitions: `100–140ms` for most interactions.
- Subtle movement only:
  - Buttons and cards lift by `1–2px` on hover.
  - Opacity fades for content switches.
- Clock animations:
  - Seconds may pulse or slide very slightly to indicate ticking.
  - Minute changes can have a gentle vertical slide, but should complete quickly (≤150ms).
- No bouncy or elastic animations.
- Frosted elements keep blur consistent—avoid changing blur radius on hover.

Futuristic means smooth, quiet micro-interactions.

---

## 10. Light ↔ Dark Mode Philosophy

Both themes:

- Maintain the same geometry, spacing, and typography.
- Shift background and text colors without altering layout.
- Use consistent accent hues for identity.
- Keep weather colors subtle in both modes.
- Preserve glass/frosted feel; in dark mode, cards are slightly more opaque to keep contrast.

Dark mode should feel like an inverse of light — not a separate theme.

---

## 11. Overall Mood & Intent

The design communicates:

- Calm focus.
- Precision.
- Efficiency.
- Subtle futuristic aesthetics.
- A cold, clean environment that supports productivity.

These rules define the visual direction and ensure the interface remains cohesive as new widgets (GitLab, weather, bookmarks, settings, etc.) are added or refined.
