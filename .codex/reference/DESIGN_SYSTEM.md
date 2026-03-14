# Clinical Data Hub — UI/UX Design System

### Product Design Reference · Version 1.0 · Senior Designer: [Your Name]

---

## Design Vision Statement

> **"The instrument panel of clinical science."**
>
> Clinical Data Hub should feel like the cockpit of a precision aircraft — every element
> purposeful, every piece of information instantly readable under pressure, every interaction
> tactile and confident. This is not a generic SaaS dashboard. It is a professional tool
> for people whose decisions affect patient lives. The design must earn that gravity.

---

## 1. Design Principles

These five principles govern every design decision. When two choices conflict, apply them in order.

### 1.1 Clarity Over Beauty

Information must be understood in under 3 seconds. Visual decoration earns its place only
if it aids comprehension. If it doesn't serve the user's task, remove it.

### 1.2 Density With Breathing Room

Clinical users work with large amounts of data across long shifts. The UI must be information-dense
without feeling overwhelming. Achieve this through a strict 8pt grid, generous vertical rhythm,
and deliberate use of whitespace as a separator — not as decoration.

### 1.3 Status Always Visible

A user should never have to search for the current state of a study, subject, or query.
Status indicators are persistent, consistent, and color-coded. Never bury status in a detail page.

### 1.4 Trust Through Consistency

Regulatory environments demand predictability. Every interaction behaves the same way every time.
Hover states, focus rings, modal patterns, confirmation dialogs — all identical across the product.
Surprise is the enemy of trust.

### 1.5 Errors Are Not Failures — They Are Guides

Validation errors, empty states, and warnings are moments of guidance — not punishment.
Copy is calm, specific, and actionable. Never display a generic "Something went wrong."

---

## 2. Brand Identity

### 2.1 Product Personality

| Attribute       | Description                                                            |
| --------------- | ---------------------------------------------------------------------- |
| **Tone**        | Precise, calm, authoritative — like a senior clinician                 |
| **Feel**        | Refined minimalism with structured density                             |
| **NOT**         | Playful, gradient-heavy, startup-casual, generic SaaS                  |
| **Inspiration** | Bloomberg Terminal clarity · Linear.app polish · Figma professionalism |

### 2.2 Logo & Wordmark

- **Primary mark:** A stylized molecule node — three circles connected by lines,
  suggesting data nodes in a network. Clean, geometric, no gradients.
- **Wordmark font:** `DM Sans` — geometric but warmer than Helvetica
- **Lockup:** Icon left + wordmark right, 8px gap
- **Minimum size:** 24px height for icon, never scale below this
- **Clear space:** Equal to the icon height on all four sides
- **Forbidden:** Never stretch, recolor, or add drop shadows to the logo

---

## 3. Color System

### 3.1 Core Palette

```
/* ── Primary ─────────────────────────────────────────── */
--color-navy-900:    #0D2137;   /* Deepest navy — page backgrounds (dark mode) */
--color-navy-800:    #1F4E79;   /* Primary brand — headers, primary CTAs */
--color-navy-700:    #2E75B6;   /* Secondary brand — links, active states */
--color-navy-600:    #4A90C4;   /* Hover states, interactive highlights */
--color-navy-100:    #D6E4F0;   /* Tinted backgrounds, selected rows */
--color-navy-50:     #EEF5FB;   /* Subtle section backgrounds */

/* ── Neutrals ────────────────────────────────────────── */
--color-gray-950:    #0A0F14;   /* True dark bg */
--color-gray-900:    #111827;   /* Dark surface */
--color-gray-800:    #1F2937;   /* Dark card */
--color-gray-600:    #4B5563;   /* Muted text */
--color-gray-400:    #9CA3AF;   /* Placeholder text */
--color-gray-200:    #E5E7EB;   /* Borders, dividers */
--color-gray-100:    #F3F4F6;   /* Table zebra stripe */
--color-gray-50:     #F9FAFB;   /* Page background (light mode) */
--color-white:       #FFFFFF;

/* ── Semantic — Status ───────────────────────────────── */
--color-success-700: #15803D;
--color-success-500: #22C55E;
--color-success-100: #DCFCE7;
--color-success-50:  #F0FDF4;

--color-warning-700: #B45309;
--color-warning-500: #F59E0B;
--color-warning-100: #FEF3C7;
--color-warning-50:  #FFFBEB;

--color-danger-700:  #B91C1C;
--color-danger-500:  #EF4444;
--color-danger-100:  #FEE2E2;
--color-danger-50:   #FFF5F5;

--color-info-700:    #1D4ED8;
--color-info-500:    #3B82F6;
--color-info-100:    #DBEAFE;
--color-info-50:     #EFF6FF;

/* ── Semantic — Study Status ─────────────────────────── */
--status-draft:      #9CA3AF;   /* Gray */
--status-active:     #22C55E;   /* Green */
--status-on-hold:    #F59E0B;   /* Amber */
--status-completed:  #3B82F6;   /* Blue */
--status-terminated: #EF4444;   /* Red */
```

### 3.2 Color Usage Rules

| Use Case                | Token                |
| ----------------------- | -------------------- |
| Page background (light) | `--color-gray-50`    |
| Card / panel background | `--color-white`      |
| Primary button          | `--color-navy-800`   |
| Primary button hover    | `--color-navy-700`   |
| Destructive button      | `--color-danger-700` |
| Body text               | `--color-gray-900`   |
| Secondary text          | `--color-gray-600`   |
| Placeholder text        | `--color-gray-400`   |
| Border default          | `--color-gray-200`   |
| Border focused          | `--color-navy-700`   |
| Selected row            | `--color-navy-100`   |
| Table zebra             | `--color-gray-100`   |

### 3.3 Dark Mode

Dark mode is **Phase 2** — do not attempt partial dark mode. Either fully support it
or ship none. For Phase 1, ship light mode only and use CSS variables throughout so
dark mode can be added by overriding the variable set.

### 3.4 Accessibility — Color Contrast Requirements

| Text Type               | Minimum Ratio | Test Against                      |
| ----------------------- | ------------- | --------------------------------- |
| Body text on white      | 7:1 (AAA)     | `#111827` on `#FFFFFF` ✅ 16.7:1  |
| Secondary text on white | 4.5:1 (AA)    | `#4B5563` on `#FFFFFF` ✅ 7.4:1   |
| White text on navy-800  | 4.5:1 (AA)    | `#FFFFFF` on `#1F4E79` ✅ 7.1:1   |
| Status badge text       | 4.5:1 minimum | Always pair dark text on light bg |

**Never** convey status with color alone. Always pair color with an icon or text label.

---

## 4. Typography

### 4.1 Font Stack

```css
/* Display / Headings */
font-family: 'DM Sans', system-ui, sans-serif;
/* Weights used: 500 (medium), 600 (semibold), 700 (bold) */

/* Body / UI */
font-family: 'IBM Plex Sans', system-ui, sans-serif;
/* Weights used: 400 (regular), 500 (medium) */

/* Monospace — data values, IDs, codes, audit logs */
font-family: 'IBM Plex Mono', 'Fira Code', monospace;
/* Weight used: 400 only */
```

**Why these fonts:**

- `DM Sans` — geometric precision with subtle warmth. Authoritative without coldness.
- `IBM Plex Sans` — designed for data-dense interfaces. Outstanding at small sizes.
  The "IBM" heritage signals trust and professionalism unconsciously.
- `IBM Plex Mono` — patient IDs, protocol numbers, audit timestamps all use mono.
  It signals "this is data, not prose" without any extra UI treatment.

### 4.2 Type Scale

```css
/* Display — hero numbers on dashboard */
--text-display: 2.5rem / 3rem font: DM Sans 700 /* H1 — page titles */ --text-h1: 1.5rem / 2rem
  font: DM Sans 600 /* H2 — section headings */ --text-h2: 1.25rem / 1.75rem font: DM Sans 600
  /* H3 — card titles, sub-sections */ --text-h3: 1rem / 1.5rem font: DM Sans 600
  /* Body Large — lead paragraphs, descriptions */ --text-body-lg: 1rem / 1.625rem font: IBM Plex
  Sans 400 /* Body — default UI text */ --text-body: 0.875rem / 1.5rem font: IBM Plex Sans 400
  /* Body Small — secondary info, captions */ --text-body-sm: 0.75rem / 1.25rem font: IBM Plex Sans
  400 /* Label — form labels, table headers */ --text-label: 0.75rem / 1rem font: IBM Plex Sans 500
  letter-spacing: 0.04em UPPERCASE /* Mono — IDs, codes, timestamps */ --text-mono: 0.8125rem /
  1.5rem font: IBM Plex Mono 400 /* Micro — badges, tags */ --text-micro: 0.6875rem / 1rem font: IBM
  Plex Sans 500 letter-spacing: 0.06em UPPERCASE;
```

### 4.3 Typography Rules

- **Never** use font weight below 400
- **Never** use more than 2 font families on one screen
- Line length for readable prose: 60–80 characters max (use `max-w-prose`)
- Table cell text: always `text-body` — never smaller in a data table
- Protocol numbers, subject IDs, timestamps: always `font-mono`
- Page titles: `text-h1` + `DM Sans 600` — no exceptions

---

## 5. Spacing & Grid

### 5.1 Base Unit

**8pt grid.** Every spacing value is a multiple of 8px (or 4px for micro-adjustments).

```
4px   — micro gap (icon to label, badge padding)
8px   — xs (tight component internals)
12px  — sm (form field padding, list item gap)
16px  — md (card padding inner, section gap)
24px  — lg (between cards, section padding)
32px  — xl (page section separation)
48px  — 2xl (major section breaks)
64px  — 3xl (hero areas)
```

### 5.2 Page Layout

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Main Content Area        │
│                         │  max-width: 1280px        │
│                         │  padding: 32px 40px       │
│                         │                           │
│                         │  ┌─────────────────────┐  │
│                         │  │  Page Header        │  │
│                         │  │  h1 + actions row   │  │
│                         │  └─────────────────────┘  │
│                         │  ┌─────────────────────┐  │
│                         │  │  Content            │  │
│                         │  └─────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

- Sidebar: `240px` collapsed to `64px` (icon-only mode)
- Content max-width: `1280px` centered
- Content padding: `40px` horizontal, `32px` vertical
- On tablet (1024px–1279px): sidebar collapses to icon-only automatically

### 5.3 Card & Panel Spacing

```
Card padding:           24px
Card border-radius:     8px
Card border:            1px solid --color-gray-200
Card shadow:            0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)
Card shadow hover:      0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)

Table row height:       48px (comfortable), 40px (compact mode)
Table header height:    40px
Table cell padding:     12px 16px
```

---

## 6. Component Design Specifications

### 6.1 Buttons

#### Variants

```
Primary
  Background:   --color-navy-800
  Text:         white
  Hover:        --color-navy-700
  Active:       --color-navy-900
  Disabled:     --color-gray-200 bg, --color-gray-400 text
  Height:       40px
  Padding:      0 16px
  Border-radius: 6px
  Font:         IBM Plex Sans 500, 14px

Secondary (Outline)
  Background:   white
  Border:       1px solid --color-gray-200
  Text:         --color-gray-900
  Hover:        --color-gray-50 bg, --color-gray-300 border
  Height:       40px

Destructive
  Background:   --color-danger-700
  Text:         white
  Hover:        #991B1B (darker red)
  Use only for: delete, terminate, withdraw — irreversible actions

Ghost
  Background:   transparent
  Text:         --color-navy-700
  Hover:        --color-navy-50 bg
  Use for:      secondary actions in toolbars, icon buttons

Sizes:
  sm:   height 32px, padding 0 12px, font 12px
  md:   height 40px, padding 0 16px, font 14px  ← default
  lg:   height 48px, padding 0 24px, font 16px  ← modal CTAs only
```

#### Button Rules

- Primary button is **always the rightmost** action in any button group
- Destructive actions always require a **confirmation dialog** — never a direct action button
- Loading state: replace button text with a spinner + "Processing..." — never disable silently
- Icon buttons: always include `aria-label` and a tooltip on hover
- Never place two primary buttons side by side on the same level

---

### 6.2 Form Inputs

```
Input field
  Height:         40px
  Padding:        10px 12px
  Border:         1px solid --color-gray-200
  Border-radius:  6px
  Background:     white
  Font:           IBM Plex Sans 400, 14px
  Color:          --color-gray-900
  Placeholder:    --color-gray-400

  :focus
    Border:       2px solid --color-navy-700
    Outline:      none
    Box-shadow:   0 0 0 3px rgba(46, 117, 182, 0.15)

  :error
    Border:       1px solid --color-danger-500
    Background:   --color-danger-50
    :focus shadow: 0 0 0 3px rgba(239, 68, 68, 0.15)

  :disabled
    Background:   --color-gray-100
    Border:       1px solid --color-gray-200
    Color:        --color-gray-400
    Cursor:       not-allowed

Label
  Font:           IBM Plex Sans 500, 12px
  Color:          --color-gray-700
  Text-transform: UPPERCASE
  Letter-spacing: 0.04em
  Margin-bottom:  6px

  Required indicator: red asterisk (*) after label text
                      sr-only "required" for screen readers

Helper text
  Font:           IBM Plex Sans 400, 12px
  Color:          --color-gray-500
  Margin-top:     4px

Error message
  Font:           IBM Plex Sans 400, 12px
  Color:          --color-danger-700
  Margin-top:     4px
  Icon:           ⚠ warning icon before text
```

---

### 6.3 Status Badges

Status badges are one of the most frequently seen elements. They must be instantly readable.

```
Structure:  [● dot] [STATUS TEXT]

Dot size:       6px circle
Badge padding:  2px 8px
Border-radius:  full (9999px)
Font:           IBM Plex Sans 500, 11px UPPERCASE letter-spacing 0.06em

Study Status:
  Draft       → gray-100 bg    gray-600 text    gray-400 dot
  Active      → success-100 bg success-700 text success-500 dot
  On Hold     → warning-100 bg warning-700 text warning-500 dot
  Completed   → info-100 bg    info-700 text    info-500 dot
  Terminated  → danger-100 bg  danger-700 text  danger-500 dot

Subject Status:
  Screened    → gray-100 bg    gray-600 text
  Enrolled    → navy-100 bg    navy-800 text
  Randomized  → info-100 bg    info-700 text
  Completed   → success-100 bg success-700 text
  Withdrawn   → warning-100 bg warning-700 text
  Screen Failed → danger-100 bg danger-700 text

Query Status:
  Open        → danger-100 bg  danger-700 text
  Answered    → warning-100 bg warning-700 text
  Closed      → success-100 bg success-700 text
  Cancelled   → gray-100 bg    gray-500 text
```

---

### 6.4 Data Tables

Tables are the most critical component in this product. 80% of work happens in tables.

```
Table structure:
  ┌──────────────────────────────────────────────────┐
  │  Toolbar: [Search] [Filters] ──────── [Export] [+New] │
  ├──────────────────────────────────────────────────┤
  │  COLUMN HEADER  ↑  │  COLUMN  │  COLUMN  │  ACTIONS │
  ├──────────────────────────────────────────────────┤
  │  Row data           │          │          │  ···     │
  │  Row data (zebra)   │          │          │  ···     │
  ├──────────────────────────────────────────────────┤
  │  Showing 1–25 of 148    [< Prev]  1 2 3  [Next >]   │
  └──────────────────────────────────────────────────┘

Column headers:
  Background:       --color-gray-50
  Font:             IBM Plex Sans 500, 12px UPPERCASE, letter-spacing 0.04em
  Color:            --color-gray-500
  Sortable columns: show ↕ icon, active sort shows ↑ or ↓ in navy-700
  Height:           40px
  Border-bottom:    2px solid --color-gray-200

Row:
  Height:           48px (default), 40px (compact)
  Border-bottom:    1px solid --color-gray-100
  Even rows:        white
  Odd rows:         --color-gray-50 (subtle zebra)
  Hover:            --color-navy-50 bg
  Selected:         --color-navy-100 bg, left border 3px solid navy-700
  Click target:     entire row is clickable for detail view

Cells:
  Padding:          12px 16px
  Font:             IBM Plex Sans 400, 14px, --color-gray-900
  IDs/codes:        IBM Plex Mono 400, 13px

Action column:
  Always last column, 48px wide
  Three-dot (···) menu button — visible only on row hover
  Never show delete as a direct table action — always in detail page

Empty state:
  Centered in table body, min-height 240px
  Icon (48px) + heading + subtext + CTA button
  Never show "No data found" alone — always explain why and what to do
```

---

### 6.5 Sidebar Navigation

```
Sidebar width:    240px (expanded), 64px (collapsed)
Background:       --color-navy-900
Transition:       width 200ms ease

Logo area:
  Height:         64px
  Padding:        0 20px
  Border-bottom:  1px solid rgba(255,255,255,0.08)

Nav item (default):
  Height:         40px
  Padding:        0 12px
  Border-radius:  6px
  Font:           IBM Plex Sans 500, 14px
  Color:          rgba(255,255,255,0.65)
  Icon:           20px, same color

Nav item (hover):
  Background:     rgba(255,255,255,0.06)
  Color:          rgba(255,255,255,0.90)

Nav item (active):
  Background:     rgba(255,255,255,0.12)
  Color:          white
  Left border:    3px solid --color-navy-600
  Icon:           white

Section label:
  Font:           IBM Plex Sans 500, 10px UPPERCASE letter-spacing 0.08em
  Color:          rgba(255,255,255,0.35)
  Padding:        16px 16px 4px
  Not clickable

Collapse button:
  Bottom of sidebar
  Chevron icon rotates 180° when collapsed

Study context nav:
  When inside a study, sidebar shows:
  ├── ← Back to All Studies
  ├── [Study Name] (truncated, tooltip on hover)
  ├── Overview
  ├── Subjects
  ├── Forms
  ├── Data Entry
  ├── Queries  [badge: open count]
  ├── Sites
  ├── Audit Trail
  └── Export
```

---

### 6.6 Modals & Dialogs

```
Confirmation dialog (destructive action):
  Max-width:      400px
  Icon:           48px warning/danger icon centered at top
  Title:          DM Sans 600, 18px, centered
  Body:           IBM Plex Sans 400, 14px, centered, --color-gray-600
  Buttons:        Cancel (secondary) + Confirm action (destructive)
  Backdrop:       rgba(0,0,0,0.5) blur(4px)

Form modal (e.g. add site, add user):
  Max-width:      560px
  Header:         title + X close button
  Body:           scrollable, max-height 70vh
  Footer:         Cancel + Submit, always sticky at bottom
  Animation:      scale(0.95) → scale(1) + opacity 0→1, 150ms ease-out

Signature modal (21 CFR Part 11):
  Max-width:      480px
  Must include:
    - Meaning text (what the user is certifying) in a bordered box
    - Password re-entry field
    - Timestamp preview
    - Legal declaration text in --color-gray-600
    - "Sign" button disabled until password field is non-empty
  Background:     slightly warmer white (#FEFEFE) to signal gravity
```

---

### 6.7 Dashboard Widgets

```
Stat card (KPI):
  ┌─────────────────────────────┐
  │  [Icon]  LABEL              │
  │                             │
  │  123          ▲ +12%        │
  │  (display)    (trend)       │
  └─────────────────────────────┘
  Card padding:   24px
  Label:          12px UPPERCASE IBM Plex Sans 500, --color-gray-500
  Value:          2.5rem DM Sans 700, --color-gray-900
  Trend up:       --color-success-600
  Trend down:     --color-danger-600
  Icon:           24px, --color-navy-600, top-right corner

Chart cards:
  Title:          DM Sans 600, 16px
  Legend:         12px IBM Plex Sans 400, dots match chart colors
  Empty state:    centered "No data yet" with sub-label
  Loading:        animated skeleton bars in chart area
```

---

## 7. Page-by-Page Design Specifications

### 7.1 Login Page

**Layout:** Full viewport split — left 55% brand panel, right 45% form panel.

```
Left panel:
  Background:     --color-navy-900
  Content:        Logo (top-left) + Hero headline + abstract geometric
                  illustration of data nodes (SVG, navy-700 lines on navy-900)
  Headline:       DM Sans 700, 36px, white
                  "Clinical data. Captured precisely."
  Subtext:        IBM Plex Sans 400, 16px, rgba(white, 0.65)

Right panel:
  Background:     white
  Content:        vertically centered form
  Form width:     360px
  Title:          DM Sans 600, 24px, --color-gray-900
                  "Sign in to your workspace"
  Fields:         Email → Password → Remember me checkbox → Sign In button
  Alt:            "Sign in with magic link" ghost button below primary
  Bottom:         Privacy policy + Terms links, 12px, --color-gray-400
```

---

### 7.2 Global Dashboard

**Layout:** 3-column stat row + 2-column chart row + activity feed

```
Row 1 — Stat cards (4 across):
  Active Studies | Total Subjects | Open Queries | Pending Exports

Row 2 — Charts (2 col):
  Left (60%):  Enrollment progress by study — horizontal grouped bar chart
  Right (40%): Query status breakdown — donut chart

Row 3 — Full width:
  Recent activity feed — timeline list
  Each item: [avatar initials] [action text] [entity link] [time ago]
  Max 10 items, "View full audit trail →" link at bottom

Page header:
  Left:   "Good morning, [First Name]" — DM Sans 600, 24px
  Right:  [+ New Study] primary button
```

---

### 7.3 Studies List

```
Page header:
  Title:    "Studies"
  Right:    [+ New Study]

Toolbar:
  Left:   Search input (240px wide, placeholder "Search by title or protocol...")
  Right:  [Phase ▾] [Status ▾] filter dropdowns

Table columns:
  Title (sortable) | Protocol No. (mono) | Phase | Status (badge) |
  Sites | Enrolled | Start Date | Actions (···)

Row click → Study detail page
Protocol number: IBM Plex Mono, always uppercase
Empty state: "No studies yet — create your first study to get started" + [+ New Study]
```

---

### 7.4 Study Detail Page

```
Study header (persistent, not in tab content):
  ┌──────────────────────────────────────────────────────────┐
  │  ← Studies                                               │
  │  [Study Title]                          [Status badge]   │
  │  Protocol: CDH-001 · Phase II · 3 sites · 47 subjects    │
  │                          [Edit Study] [···More actions]  │
  └──────────────────────────────────────────────────────────┘

Tab navigation (under header, full width):
  Overview | Subjects | Forms | Data | Queries [12] | Sites | Audit | Export

Tab indicator: 2px bottom border, --color-navy-700, animated slide

Overview tab content:
  Row 1: 4 stat cards (Enrollment progress, Data completion, Open queries, Days active)
  Row 2: Enrollment by site bar chart + Upcoming visits list
  Row 3: Recent activity feed (study-scoped)
```

---

### 7.5 CRF Form Builder

```
Layout: Split pane — left 280px field palette, right form canvas

Left palette:
  Section label: "FIELD TYPES"
  Draggable items:
    [≡] Text Input
    [#] Number
    [📅] Date
    [▼] Dropdown
    [⊙] Radio Group
    [☐] Checkbox Group
    [¶] Text Area
    [─] Section Header
  Each item: white card, 40px height, gray-200 border, drag handle icon

Right canvas:
  Background:     --color-gray-50
  Drop zone:      dashed border when dragging, navy-100 bg highlight on hover
  Each field card: white, 8px radius, shadow-sm
    Header: drag handle + field label + [Edit] [Duplicate] [Delete] icons
    Preview: shows the actual rendered field input (greyed out, not interactive)
  Conditional badge: if field has condition, show "🔗 Conditional" micro badge

Right panel (field config):
  Slides in from right when a field is selected, 320px wide
  Sections: Label | Type | Validation | Conditional Logic | Help Text
  Live preview updates as user types in config panel
  [Save Field] button at bottom

Top toolbar:
  Left:   Form name (editable inline, click to edit)
  Center: [Preview] toggle button
  Right:  [Save Draft] [Publish v1 ▸]
```

---

### 7.6 Data Entry (eCRF)

```
Layout: Full-width form, max-width 720px centered

Form header (sticky):
  Subject ID (mono, large) | Visit | Form Name | [Save Draft] [Submit]
  Progress bar: fields completed / total required

Form body:
  Section headers: DM Sans 600, 14px, navy-800, with bottom border
  Fields: standard input design from §6.2
  Required fields: asterisk + "Required" in micro label
  Conditional fields: slide in/out with 150ms height animation — no layout jump
  Previously entered values: shown in --color-gray-400 as pre-fill
  Queried fields: left border 3px solid --color-danger-500, subtle danger-50 bg

Save states:
  Auto-save indicator: top-right, "Saved 2 min ago" in gray-400, 12px
  Saving: pulsing dot + "Saving..."
  Error:  "Save failed — check connection" in danger-600

Submit confirmation:
  Modal: "Submit this form?" + summary of filled fields + required fields count
  Once submitted: form switches to read-only mode with lock icon
```

---

### 7.7 Query Management

```
Query list toolbar:
  Left:   [All] [Open] [Answered] [Closed] filter tabs (underline style)
  Right:  [Subject ▾] [Form ▾] [Priority ▾] filters + search

Table columns:
  # | Subject | Form | Field | Query | Priority | Assigned To | Status | Raised | Actions

Query detail (slide-over panel, 480px from right):
  Header:     Query # + status badge
  Context:    Subject ID · Form name · Field name · Data value
  Timeline:
    [Avatar] Raised by [Name] on [Date]
    [Query text in bordered box]
    [Avatar] Response by [Name] on [Date]
    [Response text]
    [Textarea] Your response... + [Submit Response] button
  Actions:    [Close Query] [Assign to ▾] [Change Priority ▾]

Priority indicators:
  High:    red dot + "HIGH" micro badge
  Normal:  no indicator
  Low:     gray dot + "LOW" micro badge
```

---

### 7.8 Audit Trail

```
Important: This is a read-only, compliance-critical page.
Design must signal immutability and trust.

Page header:
  Title: "Audit Trail"
  Subtitle: "Tamper-proof record of all system actions" — italic, gray-500
  Right: [Export CSV ▾] with date range picker

Filters:
  Date range picker | User | Action type | Entity type

Table columns:
  Timestamp (mono) | User | Action | Entity | Before → After | IP Address

Timestamp: always show full datetime in ISO format — no relative times here
           IBM Plex Mono, 13px

Before → After diff:
  Inline: [old value] → [new value]
  Old:    --color-danger-100 bg, strikethrough text
  New:    --color-success-100 bg, bold text
  If no before (creation): show only new value in success style
  If no after (deletion): show only old value in danger style

Row background by action type:
  DATA_ENTRY_SUBMITTED: white (most common, no noise)
  SIGNATURE_APPLIED:    very subtle navy-50 tint
  STUDY_LOCKED:         subtle warning-50 tint
  USER_LOGIN/LOGOUT:    white
  Data changes:         white

No pagination — use virtual scroll for performance.
Max rows per load: 100, "Load more" at bottom.
```

---

## 8. Motion & Animation

### 8.1 Principles

- Motion must have purpose — it should orient the user, not entertain them
- Clinical context = conservative motion. No bouncy springs. No playful easing.
- Duration cap: 300ms for most transitions. 150ms for micro-interactions.

### 8.2 Motion Tokens

```css
--duration-instant: 100ms; /* Tooltips, focus rings */
--duration-fast: 150ms; /* Button hover, badge appearance */
--duration-normal: 200ms; /* Modals, dropdowns, slide-overs */
--duration-slow: 300ms; /* Page transitions, sidebar */

--ease-default: cubic-bezier(0.16, 1, 0.3, 1); /* Smooth deceleration */
--ease-in: cubic-bezier(0.4, 0, 1, 1); /* Elements leaving */
--ease-out: cubic-bezier(0, 0, 0.2, 1); /* Elements entering */
```

### 8.3 Specific Interactions

```
Modal enter:    opacity 0→1 + scale 0.97→1.0,  200ms ease-out
Modal exit:     opacity 1→0 + scale 1.0→0.97,  150ms ease-in
Slide-over:     translateX(100%)→0,             250ms ease-out
Dropdown:       opacity 0→1 + translateY(-4px→0), 150ms ease-out
Sidebar:        width transition,               200ms ease
Tab indicator:  left/width slide,              150ms ease
Row hover:      background,                    100ms ease
Status badge:   no animation — instant
Skeleton:       shimmer gradient loop,         1500ms infinite linear
Toast:          slide up from bottom + fade,   200ms ease-out
                auto-dismiss after 4s
                exit: slide down + fade,        150ms
Conditional field: max-height 0→auto + opacity, 150ms ease-out
                   (no layout jump — use max-height trick)
Page load:      stagger children 0→opacity,    60ms delay between items
```

### 8.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Iconography

### 9.1 Icon Library

Use **Lucide React** exclusively. No mixing icon sets.

### 9.2 Sizes

```
16px — inline with text, table cells, breadcrumbs
20px — nav items, buttons, form field prefixes
24px — page titles, section headers, standalone actions
48px — empty states, modal headers, onboarding
```

### 9.3 Icon + Label Rules

- Icon always left of label, 6px gap
- Never use icon alone for actions that aren't universally understood
  - ✅ Pencil icon alone is OK (universally = edit)
  - ❌ A custom "lock" icon without a label on a button is NOT OK
- All icon-only buttons must have `aria-label` and a tooltip

### 9.4 Key Icon Assignments (Consistent Across Product)

```
Studies:        BookOpen
Sites:          MapPin
Subjects:       Users
Forms (CRF):    ClipboardList
Data Entry:     PenLine
Queries:        MessageSquareWarning
Audit Trail:    Shield
Export:         Download
Signature:      PenSquare
Dashboard:      LayoutDashboard
Settings:       Settings2
Add/New:        Plus
Edit:           Pencil
Delete:         Trash2
Close/Remove:   X
Warning:        AlertTriangle
Success:        CheckCircle2
Info:           Info
Lock:           Lock
Unlock:         Unlock
Filter:         SlidersHorizontal
Search:         Search
Sort:           ArrowUpDown
More actions:   MoreHorizontal
Back:           ChevronLeft
```

---

## 10. Empty States

Every empty state must have:

1. An illustration or icon (48px Lucide icon in navy-200 color)
2. A headline (DM Sans 600, 16px)
3. A subtext explanation (IBM Plex Sans 400, 14px, gray-500) — what is this section for?
4. A primary CTA button — what should the user do first?

```
Studies list (no studies):
  Icon:     BookOpen (48px, navy-200)
  Title:    "No studies yet"
  Text:     "Create your first study to start capturing clinical data."
  CTA:      [+ Create Study]

Subjects (no subjects):
  Icon:     Users
  Title:    "No subjects enrolled"
  Text:     "Begin enrolling subjects once your study is active and sites are configured."
  CTA:      [Enroll First Subject] (disabled if study not active)

Queries (no open queries):
  Icon:     CheckCircle2 (success green)
  Title:    "No open queries"
  Text:     "All data queries have been resolved. Great work."
  CTA:      none — this is a positive state

Audit trail (no logs):
  Icon:     Shield
  Title:    "No activity recorded yet"
  Text:     "All actions taken in this study will appear here."
  CTA:      none
```

---

## 11. Responsive Design

### 11.1 Breakpoints

```css
sm:   640px    /* Not primary — most users on desktop */
md:   768px    /* Tablet portrait */
lg:  1024px    /* Tablet landscape — minimum supported for full features */
xl:  1280px    /* Desktop standard */
2xl: 1536px    /* Large desktop */
```

### 11.2 Behavior by Breakpoint

```
≥ 1280px (xl):  Full layout — expanded sidebar, all columns visible
≥ 1024px (lg):  Sidebar collapses to icon-only, table hides lowest-priority columns
768–1023px:     Sidebar becomes a drawer (hamburger toggle), cards stack to 2-col
< 768px:        READ-ONLY mode — data visible but no creation or editing
                Banner at top: "For the best experience, use a tablet or desktop."
```

### 11.3 Table Column Priority

When the viewport shrinks, hide columns in this order (last to first):

```
Always visible:     Primary identifier column (title/subject ID), Status, Actions
Hide at lg:         Secondary metadata (IP address, user agent)
Hide at md:         Date columns (keep only one most important)
Hide at sm:         All except identifier + status
```

---

## 12. Notification & Feedback Patterns

### 12.1 Toast Notifications

```
Position:     Bottom-right, 16px from edges
Max width:    380px
Stack max:    3 visible at once (oldest dismisses when 4th appears)

Types:
  Success:  green-500 left border, CheckCircle2 icon
  Error:    danger-500 left border, XCircle icon
  Warning:  warning-500 left border, AlertTriangle icon
  Info:     navy-500 left border, Info icon

Duration:   4000ms auto-dismiss
            Error toasts: 8000ms (user needs to read them)
            Never auto-dismiss a toast with an action button
```

### 12.2 Inline Validation

```
Timing:   Validate on blur first, then on change once the field has been touched
          Never validate on keydown — too aggressive

Display:
  Error:   Red text below field, AlertCircle icon, field border turns red
  Warning: Amber text, AlertTriangle icon (e.g. "Value is outside normal range")
  Success: No visible indicator — absence of error is success
```

### 12.3 Page-Level Alerts

```
Full-width banner inside content area, above page content:
  Danger:   Rare — study terminated, regulatory hold
  Warning:  Data lock pending, export failed
  Info:     System maintenance notice, new feature

Dismissible with X button
Persist across tab navigation within the study
```

---

## 13. Design Handoff Checklist

Before any component or page goes to engineering, verify:

### Visual

- [ ] All colors reference design tokens — no hardcoded hex values
- [ ] All font sizes reference type scale tokens
- [ ] All spacing uses 8pt grid values
- [ ] Dark/light backgrounds have sufficient contrast (tested with a checker)
- [ ] Component has all states designed: default, hover, focus, active, disabled, error, loading, empty

### Interaction

- [ ] All interactive elements have visible focus state
- [ ] All actions have loading state defined
- [ ] Destructive actions have confirmation dialog designed
- [ ] Form errors have error state designed for every field type
- [ ] Animations use the motion tokens from §8.2

### Accessibility

- [ ] Color alone is never the sole indicator of status
- [ ] All icons next to labels have aria-hidden="true"
- [ ] All icon-only buttons have aria-label specified in design notes
- [ ] Keyboard tab order is logical and annotated

### Responsiveness

- [ ] Design shown at xl (1280px) as primary
- [ ] At minimum, lg (1024px) breakpoint also mocked
- [ ] Column hiding strategy defined for tables

---

## 14. What This Product Must Never Look Like

Avoid these at all costs — they signal "generic SaaS" and erode the clinical trust:

- ❌ Purple/violet as a primary color
- ❌ Gradient fills on primary buttons
- ❌ Rounded corners > 8px on cards (looks toy-like)
- ❌ Drop shadows that are too large or colored
- ❌ Illustrations with cartoon people (unprofessional in clinical context)
- ❌ Emojis in any UI copy
- ❌ Generic stock icons that don't match the Lucide set
- ❌ Bold color backgrounds on the main content area
- ❌ Multiple fonts beyond the defined two
- ❌ Animations faster than 100ms or slower than 300ms
- ❌ Skeleton loaders that look like gray boxes with no relationship to the content shape
- ❌ Tables without hover states
- ❌ Forms without visible focus rings

---

_This design system is a living document. Every new component added to the product
must be documented here before engineering begins. Design leads own this document._
