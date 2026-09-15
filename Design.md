# Design — InsightScope: Global Intelligence Dashboard

Complete visual system. Purpose: prevent visual drift and generic AI-generated styling.
Document version: 1.0 (Phase 0).

---

## 1. Visual Direction

A serious modern intelligence/analytics product with an **editorial analytics aesthetic**:

- restrained surfaces, strong hierarchy, dense but readable data;
- precise spacing, subtle separators, meaningful color;
- compact controls, excellent typography, strong visual rhythm;
- feels like Bloomberg terminal research meets a high-end publication, not a marketing site.

The product is a tool for reading data — the data is the hero.

## 2. Light Theme (primary; must be flawless)

- Warm off-white application background, clean white primary surfaces, near-black text,
  muted neutral borders, deep forest/emerald primary, acid-lime selective highlight.
- Blue/orange/red appear only when charts require semantic distinction.

## 3. Dark Theme (optional; equal polish if built)

- Equivalent token set (`dark` variant) with adjusted luminance, not inverted light theme.
- Built only after the light theme and all required functionality are complete.

## 4. Color Tokens (Tailwind 4 `@theme`, CSS variables)

Light:

| Token | Value | Usage |
| --- | --- | --- |
| `--background` | `#F6F5F1` | app background (warm off-white) |
| `--surface` | `#FFFFFF` | cards, panels, tables |
| `--surface-muted` | `#EFEEE8` | subtle fills, table header, code |
| `--foreground` | `#191A1C` | primary text (near-black) |
| `--foreground-muted` | `#5F636B` | secondary text, captions |
| `--border` | `#E3E1D9` | hairlines, card borders |
| `--border-strong` | `#C9C6BC` | focus-adjacent emphasis |
| `--primary` | `#0F5A3C` | deep forest/emerald: primary actions, links, emphasis |
| `--primary-hover` | `#0B4530` | hover state of primary |
| `--highlight` | `#CDEB45` | acid-lime: selective highlight only (active chips, focus accents, landscape selection) |
| `--danger` | `#B42318` | errors, destructive |
| `--focus-ring` | `rgba(15,90,60,0.45)` | visible focus ring |

Dark (optional): background `#131416`, surface `#1B1D1F`, surface-muted `#242629`,
foreground `#E9E9E7`, foreground-muted `#9BA0A7`, border `#2B2D31`,
primary `#3E9B72`, highlight `#CDEB45` (same lime reads on both), danger `#F04438`.

### 4.1 Data Visualization Palette

Categorical (sector coloring, up to 10; remaining sectors use `#8B8E93` "Other"):

`#0F5A3C` deep green · `#3F6FB5` cobalt · `#C98A2D` amber · `#B6463F` brick ·
`#2E7D78` teal · `#7A5FA0` plum · `#7D8A2E` olive · `#5C6B7A` steel ·
`#A65A2E` rust · `#33507A` navy · `#8B8E93` other

Semantic scale (intensity/likelihood/relevance heat): low `#E8E4DA` -> mid `#6B8E7C` ->
high `#0F5A3C` (sequential green); never red/green alone for meaning.

Rules:
- Categorical colors assigned to sectors by record-count rank (top 10 get colors, rest "Other").
- Charts must not communicate meaning by color alone: always pair with labels, counts, or legend.
- Colorblind-safe contrast: no chart text on low-contrast fills; text on colored bars is
  `--foreground`, not white-on-light.

## 5. Typography

- **IBM Plex Sans** — UI, headings, labels (via `next/font/google`).
- **IBM Plex Mono** — numerals, metric values, chart ticks, codes, URLs, counts.
- Numeric values in KPIs, tables, tooltips, and chart labels always use the Mono face with
  tabular figures for alignment.

### 5.1 Type Scale

| Size | Line height | Weight | Usage |
| --- | --- | --- | --- |
| 11 | 16 | 500 | micro labels, chart ticks, legend |
| 12 | 16 | 400/500 | captions, metadata, chips |
| 13 | 20 | 400/500 | table cells, form labels |
| 14 | 20 | 400/500 | base body, controls |
| 15 | 22 | 500/600 | emphasized labels, section leads |
| 18 | 26 | 600 | chart/panel titles |
| 24 | 32 | 600 | page title |
| 32 | 40 | 600 | KPI values (Mono) |

Weights used: 400, 500, 600 (Sans); 400, 500, 600 (Mono). Nothing below 400.

## 6. Spacing, Grid, Radius, Borders, Shadows

- **Spacing**: 4px base. Layout paddings: 12 (dense), 16 (default), 24 (sections), 32 (page).
- **Grid**: desktop content: left filter rail 272px + fluid main; main charts in a 12-col
  grid with 16px gutters. KPI strip = 4–5 equal columns. Chart rows: 8/4, 4/8, 6/6, 4/4/4,
  full-width sections (see Architecture/PRD layout order).
- **Radius**: `--radius: 6px` cards and controls; 4px chips/badges; 8px sheets/dialogs only.
  No pill-shaped everything; no giant radii.
- **Borders**: 1px `--border` on cards; hairline separators between rail groups; no decorative
  double borders.
- **Shadows**: none on cards. Only elevated overlays (Popover, Sheet, Dialog, Tooltip) get a
  single restrained shadow (`0 2px 8px rgba(25,26,28,0.08)`, dark: `0 2px 8px rgba(0,0,0,0.4)`).

## 7. Layout Composition

- **Header**: 56px; left: wordmark "InsightScope" + mono sub-caption; right: dataset status
  (Mono: "1,000 records · imported <date>"), API connectivity dot + label, About/Data
  Provenance button. One hairline under.
- **Filter rail** (left, ≥1024): compact grouped sections with 11px uppercase mono group
  labels; each filter a searchable multi-select trigger showing "All" / "N selected" with
  count badge; City/SWOT sections rendered disabled with the explanation
  `Not present in supplied dataset` in muted italic; Reset Filters as a quiet text button at
  the rail bottom; active filters also rendered as removable chips above the content.
- **Main content**: sections separated by generous whitespace (24–32px), each section = chart
  panel with title row (18px title + mono subtitle).
- **Visual hierarchy**: KPI strip first (numbers read instantly), then the flagship landscape
  at 2/3 width — the single largest visual.

## 8. Chart Styles

- White `--surface` panels, 1px `--border`, 6px radius, 16–24px inner padding.
- Hairline horizontal grid only (`--border` at 40% opacity), no vertical gridlines except
  scatter axes.
- Axes: 11px Mono muted labels; axis line `--border-strong`; no tick over-rendering.
- Direct value labels on bars when they fit (11px Mono, muted); legends top-right of the plot,
  11px, swatch 8px.
- Bars: 6px radius on last corner only (top-right/top-left for horizontal); 3px min bar width
  for readability; gaps 25–35% of bar width.
- Scatter/bubbles: `fill-opacity 0.82`, stroke `--surface` 1px, radius clamped 6–32px;
  hover: radius +15% and stroke `--highlight` 1.5px (focus too).
- Treemap: 2px inner padding, 4px tile radius, muted 11px labels inside tiles where the tile
  is large enough (hide below ~44px width), value in Mono; title outside the plot.
- Empty/loading/error states per §12. Tooltips per §9.
- Informational chart SVGs: `role="img"` + `aria-label` describing the visualization and its axes;
  essential numbers also present as visible labels or adjacent table/legend.
- Interactive selectable charts (Signals Landscape, End-Year Outlook, Sector Composition, Topic Intelligence):
  composite widget pattern with `role="listbox"` on the SVG root and `role="option"` on each mark;
  `aria-activedescendant` for roving focus; `aria-multiselectable="true"` where multiple selections allowed;
  keyboard operation via Arrow keys (navigate), Home/End, Enter/Space (activate).
  Marks are NOT individually focusable (no tabindex); the SVG root is the single tab stop (tabIndex=0).

## 9. Tooltip Styles

- White surface, 1px `--border-strong`, 4px radius, one soft overlay shadow, 8px 10px padding.
- Title: 12px Sans 600. Rows: label Sans 12 muted + value Mono 12 `--foreground`.
- Values right-aligned; averages annotated (e.g., "avg intensity").
- Positioned inside the chart's relative container with viewport clamping; `pointer-events:
  none`; never the sole carrier of essential info.

## 10. Filter Styles

- Trigger: full-width 32px control, 13px text, "All" muted or "N selected" with primary
  color; chevron (Morphicon expand/collapse).
- Popover: Command list, search input on top, checkbox rows with Mono count badges on the
  right, max-height 320px with ScrollArea, footer "Clear".
- Selected state: row background `--surface-muted`, checkbox in primary.
- Active chips: 24px, 4px radius, `--surface-muted` background, 12px text, x-button; "Reset
  filters" text button with count of active filters.
- Disabled (City/SWOT): 60% opacity, cursor not-allowed, no popover, italic explanation line.

## 11. Table Styles (Records Explorer)

- 13px rows, 40px row height; sticky header (surface-muted, 11px uppercase mono labels);
- row hover `--surface-muted`; column separators none, hairline row separators;
- numeric cells Mono right-aligned; Title cell truncates at 2 lines with ellipsis;
- pagination bar: mono "1–20 of 1,000", Prev/Next quiet buttons;
- on mobile the table container scrolls horizontally (controlled), page never scrolls
  horizontally.

## 12. States

- **Loading**: per-section `Skeleton` blocks sized to the real layout (chart panel height
  reserved to avoid layout shift). No spinner centric pages; header keeps working.
- **Empty (no matching records)**: centered panel in each chart: muted icon (lucide data),
  14px "No records match the current filters", 13px muted sub-line, "Reset filters" quiet
  button. KPIs show "—" not 0.
- **Empty (field unavailable)**: City/SWOT show the disabled explanation, never a chart.
- **Error**: per-section error state: muted icon (lucide alert-circle), message from the API
  or "The dashboard could not reach the data service", Retry button; the dashboard shell,
  filters, and other sections keep working where data allows. Never a blank page.
- **Dataset empty (not seeded)**: full-page empty state with seed instructions for the operator.

## 13. Motion Guidelines

- Motion communicates state change only: control transitions 120–180ms, panels 200–260ms
  `cubic-bezier(0.2, 0, 0, 1)`.
- Filter changes animate chart elements (bars/positions/radius) via CSS 200ms ease-out; no
  choreography, no stagger cascade, no page-load entrance animations.
- `prefers-reduced-motion`: all transitions removed (`motion-reduce:`), Morphicons use
  `reducedMotion="user"`.
- Review with `emilkowalski/skills` motion/design skills before each UI phase is accepted.

## 14. Morphicons Guidelines

- Used ONLY for genuine state transitions: filter rail group expand/collapse, filter popover
  chevron rotation, menu<->close in the mobile Sheet trigger, theme state (if dark ships),
  detail panel open state.
- Data from `lucide` (icon data, not `lucide-react` components); `reducedMotion="user"` on
  every instance; `size` 16 (controls) / 18 (header); `strokeWidth` 1.75 everywhere.
- Static icons elsewhere come from `lucide-react` rendered plainly with identical stroke
  width — no morphing for decoration.

## 15. Accessibility (visual layer)

- Visible focus: 2px `--focus-ring` ring on all interactive elements; never rely on default
  browser outline removal.
- Contrast: body text ≥ 4.5:1, large text ≥ 3:1, chart labels ≥ 4.5:1 against surface.
- Charts: color never the only channel (labels/counts/legend always present).
- Touch targets ≥ 32px on desktop, ≥ 40px on mobile.
- Skip-to-content link before the header.

## 16. Responsive Behavior

- ≥1440: full layout as §7; landscape 2/3 + PESTLE 1/3; 4/4/4 distribution row.
- 1024: rail compresses to 256px; charts remain 2-up max; KPI strip 4-up.
- <1024: rail hidden; "Filters" trigger in header opens the Sheet (right side, full-height);
  charts stack single column; KPI strip becomes 2-up grid.
- 390: KPI strip 2-up; chart panels full width; tables scroll inside containers; no document
  horizontal overflow at any size; tooltips clamped inside chart containers.

## 17. Anti-Patterns (banned)

- Giant marketing hero sections; glassmorphism; glowing neon; decorative blobs/gradients.
- 24px radii everywhere; pill-shaped everything; excessive shadows; random icon boxes.
- Excessive animation; meaningless charts; fake metrics; duplicated visualizations;
  unnecessary dashboard cards; dozens of default shadcn Cards.
- Pure-black on pure-white large surfaces; blue default links outside meaningful contexts;
  colored text on colored fills; pie charts (nothing in the dataset is part-of-whole; use
  bars/treemaps/bubbles).
