# DESIGN.md — QClaw AI Assistant Desktop App

> Reverse-engineered from UI screenshots. Optimized for HTML/CSS prototype reconstruction.

---

## 1. Visual Theme & Atmosphere

**Brand Philosophy**: QClaw is an AI-native desktop productivity agent. Its design language balances approachability with power — soft, friendly whites for daylight work, transitioning to deep indigo-purple for the "Memory" module. The UI communicates calm intelligence: nothing fights for attention, every surface breathes.

**Visual Tone**: Minimal-functional, macOS-native, softly rounded, layered depth.

**Core Visual Keywords**: `clean` · `layered` · `rounded` · `soft-contrast` · `AI-native`

**Light & Texture**: Two distinct surface modes exist in the same app:
- **Light mode** (primary): Pure white surfaces, near-white page backgrounds, hairline borders, micro shadows — feels like paper on glass.
- **Dark-purple mode** (Memory module): Deep blue-purple background `#2D2A4A`, glowing text, calendar grid overlaid on dark surface.

**Splash screen**: Warm coral-to-cream gradient background (`#FDE8DC` → `#FAF5F0`), centered illustration, single-color progress bar — clearly onboarding-first.

---

## 2. Color Palette & Roles

### Primary / Brand Colors
| Role | HEX | CSS Variable | Usage |
|------|-----|--------------|-------|
| Brand Red | `#E8352B` | `--color-brand` | App icon color, agent avatar accent, destructive CTA |
| Brand Red Light | `#FF5A50` | `--color-brand-light` | Hover state on brand elements |
| Brand Red Dark | `#C02020` | `--color-brand-dark` | Active/pressed state |

### Interactive / Accent Colors
| Role | HEX | CSS Variable | Usage |
|------|-----|--------------|-------|
| Accent Blue | `#1677FF` | `--color-accent` | Selected nav item active ring, info badges |
| Accent Green | `#22C55E` | `--color-accent-green` | WhatsApp icon badge, success state, toggle ON |
| Accent Orange | `#F97316` | `--color-accent-orange` | Reward badges, "有奖" tags, fire emoji accent |
| Accent Purple | `#7C6FF7` | `--color-accent-purple` | Memory module highlight, tab active in dark mode |

### Neutral / Gray Scale
| Level | HEX | CSS Variable | Usage |
|-------|-----|--------------|-------|
| White | `#FFFFFF` | `--color-white` | Panel bg, card bg, modal bg |
| Gray 50 | `#F7F7F8` | `--color-gray-50` | Page background, sidebar bg |
| Gray 100 | `#F2F2F3` | `--color-gray-100` | Input bg, hover state bg, secondary surface |
| Gray 200 | `#E4E4E7` | `--color-gray-200` | Dividers, list separators |
| Gray 300 | `#D1D1D6` | `--color-gray-300` | Inactive icon color, placeholder color |
| Gray 400 | `#A1A1AA` | `--color-gray-400` | Tertiary text, disabled state |
| Gray 500 | `#71717A` | `--color-gray-500` | Secondary text, meta labels |
| Gray 700 | `#3F3F46` | `--color-gray-700` | Primary body text |
| Gray 900 | `#18181B` | `--color-gray-900` | Heading text, nav title |

### Surface & Borders
| Role | HEX / rgba | CSS Variable | Usage |
|------|-----------|--------------|-------|
| Page BG | `#F5F5F5` | `--color-bg-page` | Window background |
| Panel BG | `#FFFFFF` | `--color-bg-panel` | Main content area |
| Sidebar BG | `#F7F7F8` | `--color-bg-sidebar` | Left nav sidebar |
| Border Default | `rgba(0,0,0,0.08)` | `--color-border` | Card edges, input borders |
| Border Subtle | `rgba(0,0,0,0.05)` | `--color-border-subtle` | Section dividers |
| Border Strong | `rgba(0,0,0,0.15)` | `--color-border-strong` | Active input, focused state |

### Semantic Colors
| Role | HEX | CSS Variable | Usage |
|------|-----|--------------|-------|
| Success | `#22C55E` | `--color-success` | Toggle on, positive state |
| Warning | `#F59E0B` | `--color-warning` | Warning badges |
| Error | `#EF4444` | `--color-error` | Error states, red dots |
| Info | `#3B82F6` | `--color-info` | Info tooltips, selected state |

### Dark-Purple Mode (Memory Module)
| Role | HEX | CSS Variable | Usage |
|------|-----|--------------|-------|
| Dark BG | `#2D2A4A` | `--color-dark-bg` | Memory module background |
| Dark Surface | `#383461` | `--color-dark-surface` | Calendar panel, sidebar cards |
| Dark Elevated | `#423D72` | `--color-dark-elevated` | Hover state on dark bg |
| Dark Text Primary | `#F0EEFF` | `--color-dark-text` | Primary text in dark mode |
| Dark Text Secondary | `rgba(240,238,255,0.6)` | `--color-dark-text-sec` | Secondary/muted text |
| Dark Border | `rgba(255,255,255,0.12)` | `--color-dark-border` | Borders in dark mode |
| Active Tab Dark | `rgba(255,255,255,0.15)` | `--color-dark-tab-active` | Active pill in dark mode |

### Splash Screen Gradient
```css
--color-splash-start: #FDE8DC;
--color-splash-end: #FAF5F0;
background: linear-gradient(135deg, #FDE8DC 0%, #FAF5F0 60%, #FEFAF8 100%);
```

### Shadow Colors
```css
--shadow-color-sm: rgba(0, 0, 0, 0.06);
--shadow-color-md: rgba(0, 0, 0, 0.10);
--shadow-color-lg: rgba(0, 0, 0, 0.14);
--shadow-color-popup: rgba(0, 0, 0, 0.18);
```

---

## 3. Typography Rules

### Font Family
```css
--font-sans: -apple-system, "PingFang SC", "SF Pro Text", "Helvetica Neue", "Microsoft YaHei", sans-serif;
--font-mono: "SF Mono", "JetBrains Mono", "Fira Code", Menlo, monospace;
```

### Type Scale

| Level | Size | rem | Weight | Line Height | Letter Spacing | Usage |
|-------|------|-----|--------|-------------|----------------|-------|
| Display Hero | 28px | 1.75rem | 700 | 1.25 | -0.5px | Splash title |
| Heading XL | 22px | 1.375rem | 600 | 1.3 | -0.3px | Page section titles |
| Heading L | 18px | 1.125rem | 600 | 1.35 | -0.2px | Card group headings |
| Heading M | 16px | 1rem | 600 | 1.4 | -0.1px | Panel heading |
| Heading S | 14px | 0.875rem | 600 | 1.4 | 0px | Card title, item name |
| Body M | 14px | 0.875rem | 400 | 1.6 | 0px | Primary body copy |
| Body S | 13px | 0.8125rem | 400 | 1.55 | 0px | Secondary descriptions |
| Caption | 12px | 0.75rem | 400 | 1.5 | 0.1px | Meta info, timestamps |
| Nano | 11px | 0.6875rem | 500 | 1.4 | 0.2px | Badges, tags, counters |

### Design Philosophy
- **Font Stack**: System font stack prioritizing `-apple-system` / `PingFang SC` for native macOS feel; no webfonts loaded.
- **Chinese Typography**: PingFang SC at 14-16px is the sweet spot; avoid bold (700) for body CJK text — use 500 medium instead.
- **Line Height**: 1.55-1.6 for body copy ensures comfortable reading density in sidebars and list panels.
- **Letter Spacing**: Slightly negative on headings (`-0.1px` to `-0.5px`) tightens display text. Slightly positive on small caps/nano text improves legibility.

---

## 4. Component Stylings

### Buttons

```css
/* Primary Button — Black pill */
.btn-primary {
  background: #18181B;
  color: #FFFFFF;
  border: none;
  border-radius: 20px;
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}
.btn-primary:hover { background: #3F3F46; }
.btn-primary:active { background: #09090B; }

/* Secondary Button — White with border */
.btn-secondary {
  background: #FFFFFF;
  color: #18181B;
  border: 1px solid rgba(0,0,0,0.15);
  border-radius: 20px;
  padding: 7px 18px;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.btn-secondary:hover { background: #F7F7F8; border-color: rgba(0,0,0,0.25); }

/* Ghost / Text Button */
.btn-ghost {
  background: transparent;
  color: #71717A;
  border: none;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  border-radius: 8px;
}
.btn-ghost:hover { background: rgba(0,0,0,0.05); color: #18181B; }

/* Suggestion Pill — Clickable prompt suggestion */
.btn-suggestion {
  background: #F7F7F8;
  color: #3F3F46;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 20px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  transition: background 0.12s, border-color 0.12s;
}
.btn-suggestion:hover { background: #EFEFEF; border-color: rgba(0,0,0,0.14); }

/* Connect Button — Black pill in Connections page */
.btn-connect {
  background: #18181B;
  color: #FFFFFF;
  border: none;
  border-radius: 18px;
  padding: 7px 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

/* Reward Badge Button */
.btn-reward {
  background: #F97316;
  color: #FFFFFF;
  border: none;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
}
```

### Cards

```css
/* Standard Content Card */
.card {
  background: #FFFFFF;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  padding: 16px;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.card:hover {
  border-color: rgba(0,0,0,0.14);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

/* Expert Card (grid layout) */
.card-expert {
  background: #FFFFFF;
  border: 1px solid rgba(0,0,0,0.07);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
}
.card-expert:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  border-color: rgba(0,0,0,0.12);
}

/* Featured / Highlighted Card (推荐 section) */
.card-featured {
  background: #FFFCF0;  /* warm cream for 为你推荐 */
  border: 1px solid rgba(0,0,0,0.07);
  border-radius: 14px;
  padding: 20px;
}

/* Connector Card (two-column grid) */
.card-connector {
  background: #FFFFFF;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  padding: 20px 16px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

/* User Account Popup Card */
.card-popup {
  background: #FFFFFF;
  border: 1px solid rgba(0,0,0,0.10);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08);
  width: 240px;
}
```

### Inputs

```css
/* Search Input */
.input-search {
  background: #F2F2F3;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 7px 12px 7px 32px;  /* left pad for search icon */
  font-size: 14px;
  color: #18181B;
  width: 100%;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
}
.input-search::placeholder { color: #A1A1AA; }
.input-search:focus {
  background: #FFFFFF;
  border-color: rgba(0,0,0,0.20);
}

/* Chat Input Textarea */
.input-chat {
  background: #FFFFFF;
  border: 1px solid rgba(0,0,0,0.10);
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 14px;
  color: #18181B;
  width: 100%;
  min-height: 52px;
  resize: none;
  outline: none;
  font-family: var(--font-sans);
}
.input-chat::placeholder { color: #A1A1AA; }
.input-chat:focus { border-color: rgba(0,0,0,0.20); }

/* Settings Input */
.input-settings {
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(0,0,0,0.10);
  padding: 10px 0;
  font-size: 14px;
  color: #18181B;
  width: 100%;
  outline: none;
}
```

### Navigation — Left Sidebar

```css
/* Sidebar container */
.sidebar {
  width: 60px;
  background: #F7F7F8;
  border-right: 1px solid rgba(0,0,0,0.07);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 4px;
}

/* Nav Item */
.nav-item {
  width: 44px;
  height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border-radius: 10px;
  cursor: pointer;
  color: #A1A1AA;
  font-size: 11px;
  text-decoration: none;
  transition: background 0.12s, color 0.12s;
}
.nav-item:hover { background: rgba(0,0,0,0.06); color: #71717A; }
.nav-item.active {
  background: rgba(0,0,0,0.07);
  color: #18181B;
}
.nav-item .icon { width: 22px; height: 22px; }

/* Sub-Nav Tab (对话/工作室 at top) */
.tab-group {
  display: inline-flex;
  background: #F2F2F3;
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}
.tab-item {
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 400;
  color: #71717A;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.tab-item.active {
  background: #FFFFFF;
  color: #18181B;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0,0,0,0.10);
}
```

### Badges / Tags

```css
/* Category Tab (全部 / 营销部 / 办公协同部) */
.tag-category {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 400;
  color: #71717A;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  transition: all 0.12s;
}
.tag-category.active {
  background: #18181B;
  color: #FFFFFF;
  border-color: #18181B;
}
.tag-category:hover:not(.active) { background: #F2F2F3; }

/* Beta Badge */
.badge-beta {
  background: rgba(0,0,0,0.08);
  color: #71717A;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

/* Orange Reward Badge */
.badge-reward {
  background: #F97316;
  color: #FFFFFF;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

/* Usage Count Meta */
.meta-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #A1A1AA;
}
```

### Modals / Dialogs

```css
/* Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.40);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* Modal Container */
.modal {
  background: #FFFFFF;
  border-radius: 16px;
  width: 680px;
  max-width: 90vw;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.10);
  display: flex;
}

/* Settings Modal — two-column layout */
.modal-sidebar {
  width: 200px;
  background: #F7F7F8;
  border-right: 1px solid rgba(0,0,0,0.07);
  padding: 16px 12px;
}
.modal-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #18181B;
  margin: 0 0 20px;
}

/* Close Button */
.modal-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0,0,0,0.07);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #71717A;
  font-size: 14px;
}

/* Animation */
/* @keyframes modal-in { from { opacity:0; transform: scale(0.96) translateY(8px); } to { opacity:1; transform: scale(1) translateY(0); } }
.modal { animation: modal-in 0.18s cubic-bezier(0.34, 1.1, 0.64, 1); } */
```

### Toggle Switch

```css
.toggle {
  width: 44px;
  height: 26px;
  background: #E4E4E7;
  border-radius: 13px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}
.toggle.on { background: #22C55E; }
.toggle::after {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  background: #FFFFFF;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.20);
  transition: transform 0.2s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.toggle.on::after { transform: translateX(18px); }
```

---

## 5. Layout Principles

### Spacing System
Base unit: **4px**

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Icon-text gap, tag inner padding |
| `--space-2` | 8px | Compact item gap |
| `--space-3` | 12px | Default item gap, button padding |
| `--space-4` | 16px | Card padding, section gap |
| `--space-5` | 20px | Panel horizontal padding |
| `--space-6` | 24px | Modal padding, section header margin |
| `--space-8` | 32px | Large section gap |
| `--space-10` | 40px | Page vertical padding |
| `--space-12` | 48px | Hero section padding |

### App Layout Structure
```
┌─────────────────────────────────────────────────┐
│  macOS traffic lights (12px from edges)          │
├──────┬──────────────────┬───────────────────────┤
│  60px│   240px sidebar  │   flex: 1 main area   │
│ nav  │   (conditional)  │                       │
│      │                  │                       │
│ icon │  conversation /  │   content panel       │
│ nav  │  agent list      │                       │
└──────┴──────────────────┴───────────────────────┘
```

### Grid System

| Context | Columns | Gap | Max Width |
|---------|---------|-----|-----------|
| Expert card grid | 4 col | 12px | 100% |
| Connection list | 2 col | 16px | 100% |
| Lab featured | 3 col | 16px | 100% |
| Modal two-col | auto | - | 680px |

### Container Widths
```css
--sidebar-width-narrow: 60px;     /* icon-only left nav */
--sidebar-width-wide: 240px;      /* conversation list / agent list */
--content-min-width: 500px;       /* main content area */
--modal-width: 680px;
--chat-input-max: 800px;
```

### Whitespace Philosophy
- Content area uses generous internal padding (20px sides) — nothing touches window edges.
- Card grids use consistent 12-16px gaps — dense but not cramped.
- List items in sidebar use 6-8px vertical padding — scannable at a glance.
- Empty states center content vertically — always with illustration + text + action.

---

## 6. Depth & Elevation

### Shadow System

```css
/* shadow-xs: hairline elevation — subtle card lift */
--shadow-xs: 0 1px 2px rgba(0,0,0,0.06);

/* shadow-sm: default card shadow */
--shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);

/* shadow-md: hover card shadow */
--shadow-md: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);

/* shadow-lg: dropdown / popup menu */
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12), 0 3px 8px rgba(0,0,0,0.08);

/* shadow-xl: user account popup */
--shadow-xl: 0 12px 32px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08);

/* shadow-2xl: modal dialog */
--shadow-2xl: 0 20px 60px rgba(0,0,0,0.20), 0 6px 20px rgba(0,0,0,0.10);

/* shadow-tab: active tab pill */
--shadow-tab: 0 1px 3px rgba(0,0,0,0.10);
```

### Surface Layers

| Layer | Background | Elevation | Examples |
|-------|-----------|-----------|---------|
| `page` | `#F5F5F5` | 0 | Window background |
| `panel` | `#FFFFFF` | 1 | Main content panels |
| `sidebar` | `#F7F7F8` | 1 | Left navigation panels |
| `card` | `#FFFFFF` | 2 | Content cards, list items |
| `popup` | `#FFFFFF` | 4 | Dropdown menus, user popup |
| `modal` | `#FFFFFF` | 5 | Settings dialog, overlays |
| `overlay` | `rgba(0,0,0,0.40)` | 6 | Modal backdrop |

### Z-index Scale
```css
--z-base: 0;
--z-card: 1;
--z-sticky: 100;     /* sticky nav elements */
--z-dropdown: 200;   /* dropdowns, tooltips */
--z-popup: 300;      /* user popup, account card */
--z-modal: 400;      /* modal dialogs */
--z-overlay: 500;    /* modal backdrop */
--z-toast: 600;      /* notification toasts */
```

### Backdrop Effects
```css
/* Modal overlay blur */
.modal-overlay { backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }

/* Dark mode header blur (Memory module) */
.dark-header { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
```

---

## 7. Do's and Don'ts

### Do's ✓
1. **Use system font stack** — `-apple-system, PingFang SC` for authentic macOS feel across all text.
2. **Maintain two-panel layout** — narrow 60px icon nav + wider content sidebar + main panel; all three zones always visible.
3. **Use hairline borders** (`1px rgba(0,0,0,0.08)`) for cards; they disappear on white backgrounds and add subtle structure.
4. **Apply rounded-full (pill) shape** to CTA buttons (`border-radius: 20px+`) — consistent with the overall soft vocabulary.
5. **Use black (`#18181B`) as the primary interactive color** — avoids brand-color fatigue; only use brand red for identity and destructive actions.
6. **Empty states always have**: illustration (3D emoji/icon) + heading + subtext + primary action button.
7. **Support dual surface modes** — all components should declare both light and dark-purple variants for the Memory module.
8. **Progress bars use brand red** (`#E8352B`) on a light gray track (`#E4E4E7`), `border-radius: 4px`.

### Don'ts ✗
1. **Don't use color-heavy backgrounds** in light mode panels — keep panel backgrounds white or near-white only.
2. **Don't use full-width buttons** unless in mobile or modal contexts — pill buttons float naturally within their container.
3. **Don't mix multiple brand colors** on the same screen — accent colors (orange, green, purple) each occupy their semantic role.
4. **Don't use font-size below 11px** — even counters and nano badges stay at 11px.
5. **Don't use heavy font weights (800/900)** — max font-weight is 700 for display, 600 for headings; body stays at 400.
6. **Don't use drop shadows on the sidebar** — sidebar is a flat surface, no elevation needed.
7. **Don't center-align body text** in list views — left-aligned text always; center-align only for empty states.
8. **Don't use border-radius less than 8px** on interactive elements — keep all interactive elements rounded.

---

## 8. Responsive Behavior

### Breakpoints

```css
/* Mobile: full-screen single panel */
@media (max-width: 640px) { }

/* Tablet: collapsed sidebar */
@media (min-width: 641px) and (max-width: 1024px) { }

/* Desktop: standard three-panel layout */
@media (min-width: 1025px) and (max-width: 1440px) { }

/* Wide: expanded content area */
@media (min-width: 1441px) { }
```

### Layout Collapse Strategy

| Width | Left Nav | Second Panel | Main Panel |
|-------|---------|--------------|------------|
| >1024px | 60px icons + labels | 240px visible | flex:1 |
| 768-1024px | 60px icons only | 200px visible | flex:1 |
| <768px | hidden (hamburger) | hidden | full screen |

### Touch Targets
- Minimum touch target: **44×44px** (matches Apple HIG)
- Nav items: 44×44px
- Buttons: min-height 40px
- Toggle switches: 44×26px (full tap zone 44px tall)
- List items: min-height 52px

### Font Scaling

| Breakpoint | Body | Heading M | Caption |
|-----------|------|-----------|---------|
| Desktop | 14px | 16px | 12px |
| Tablet | 14px | 15px | 12px |
| Mobile | 15px | 17px | 13px |

### Grid Collapse

| Context | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Expert cards | 4 col | 2 col | 1 col |
| Connector cards | 2 col | 1 col | 1 col |
| Lab featured | 3 col | 2 col | 1 col |

---

## 9. Agent Prompt Guide

### Quick Reference

```
App: QClaw — macOS AI Agent desktop app
Theme: Clean white light mode + deep-purple dark mode (Memory module)
Colors: White panels, #F7F7F8 sidebar bg, #18181B text, #E8352B brand red
Font: -apple-system / PingFang SC, 14px body, 12px meta
Radius: 8px base, 12px cards, 20px+ pills, 16px modals
Shadows: Subtle — 0 1px 3px rgba(0,0,0,0.08) cards, 0 20px 60px rgba(0,0,0,0.20) modals
Layout: 60px icon nav + 240px panel + flex:1 content
Border: 1px solid rgba(0,0,0,0.08) on cards
```

### Component Prompts

**① Chat Message Page**
```
Create a QClaw-style chat message view. White main area (#FFFFFF), body text 14px -apple-system.
Message bubbles: no bubble bg, just text with 16px horizontal padding.
Bottom input bar: rounded rect (border-radius:12px) with attachment, voice, send icons.
Below input: small "Auto" and "连接" pill dropdowns (14px, rounded-full, border:1px solid rgba(0,0,0,0.12)).
```

**② Expert Marketplace Grid**
```
Build an expert card grid (4 columns, gap:12px). Each card: white bg, 1px rgba(0,0,0,0.07) border, border-radius:12px, padding:16px.
Card content: 56px avatar icon (rounded-12), bold title (14px/600), description (13px/400/#71717A, 2 lines), author tag + usage counters at bottom.
At top: 3 featured section cards side-by-side (warm yellow / orange / blue tinted bg, border-radius:14px).
Category filter tabs: pill shape, active=black bg white text, inactive=transparent gray text.
```

**③ Left Navigation Sidebar**
```
Create a 60px-wide vertical navigation sidebar. Background: #F7F7F8, right border: 1px rgba(0,0,0,0.07).
Top: user avatar (32px circle). Below: icon nav items (对话/专家/任务/文件/连接/记忆/Lab) spaced 4px apart.
Each item: 44×44px, border-radius:10px, icon 22px + label 11px below. Active state: rgba(0,0,0,0.07) bg + #18181B text.
Bottom: external link icons (WhatsApp green dot, notification bell, settings gear).
```

**④ Memory Module (Dark Mode)**
```
Implement QClaw Memory module with deep-purple dark theme.
Background: #2D2A4A. Left panel (calendar + expert list): #383461, border-right: 1px rgba(255,255,255,0.12).
Calendar grid: white/dimmed text, today highlighted with red #E8352B circle, current month dates in rgba(240,238,255,0.9).
Top tab bar: pill tabs (日记/做梦/长期记忆), active tab: rgba(255,255,255,0.15) bg, white text.
Right content area: centered empty state with 3D book illustration + text + "去聊天" white pill button.
```

**⑤ Connection Cards Grid**
```
Build a 2-column connection service grid. Each card: white bg, 1px rgba(0,0,0,0.08) border, border-radius:12px, padding:20px 16px.
Card layout: 48px service icon (rounded-12) | service name (14px/600) + description (13px/400/#71717A, 3 lines truncated) | "连接" black pill button (right-aligned).
Top: category filter tabs (全部23/文档知识/办公协同/邮件服务/生活服务/网盘存储).
```

**⑥ Settings Modal**
```
Create a settings modal dialog. Overlay: rgba(0,0,0,0.40) with backdrop-filter:blur(4px).
Modal: white, border-radius:16px, 680px wide, two-column layout.
Left sidebar (200px): gray bg #F7F7F8, list of setting categories with icon+text, active item has white bg rounded-8 highlight.
Right content: 24px padding, rows of setting items (label left, value/control right), dividers between rows.
Controls: toggle switches (44×26px, green when on), dropdown selectors, slider for font size.
Close button: top-right, 28px circle, rgba(0,0,0,0.07) bg.
```

### Iteration Guide

1. **Start with the shell** — Build the three-panel layout (60px nav + 240px sidebar + flex main) before any content.
2. **Use system fonts, skip Google Fonts** — `font-family: -apple-system, "PingFang SC", sans-serif` is the foundation.
3. **Black is your CTA color** — Use `#18181B` for all primary buttons, not brand red.
4. **Every card gets `transition: box-shadow 0.15s`** — hover feedback is essential for desktop apps.
5. **Category tabs use pill shape** — `border-radius: 20px`, active state is `background: #18181B; color: #FFFFFF`.
6. **Empty states always need three elements** — 3D illustration (emoji or custom) + heading + action button.
7. **Dark mode scope is narrow** — Only the Memory module uses dark-purple; everything else stays light.
8. **Popups need real shadows** — Account/user popup: `box-shadow: 0 12px 32px rgba(0,0,0,0.16)` to feel elevated.
9. **Border subtlety matters** — Cards use `1px rgba(0,0,0,0.08)`, not `1px #EEEEEE`; the alpha transparency adapts to any bg.
10. **Keep badge text tiny but bold** — `font-size: 11px; font-weight: 600` for count badges and tags.
