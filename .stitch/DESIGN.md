---
name: Fasted Calendar
source: Stitch project [stitch-project-id] (Biblical Fasting Journey)
preview: https://stitch.withgoogle.com/preview/[stitch-project-id]
---

# Fasted Calendar Design System

Synced from Stitch HTML exports (Today, Calendar, Journal, Phases, Progress, Settings).

## Typography

| Token | Font | Size / Weight |
|-------|------|----------------|
| display-scripture | Playfair Display | 32px / 600 |
| headline-lg-mobile | Playfair Display | 24px / 700 |
| headline-md | Playfair Display | 22px / 600 |
| body-lg | Inter | 18px / 400 |
| body-md | Inter | 16px / 400 |
| label-caps | Inter | 12px / 600, 0.05em tracking |

## Core colors

| Token | Hex | Usage |
|-------|-----|-------|
| primary | `#173d00` | Headlines, icons, brand |
| secondary | `#506442` | Labels, accents |
| secondary-container | `#d2eabf` | Active nav, buttons |
| primary-container | `#29560d` | Commitment cards |
| on-primary-container | `#96cb75` | Text on primary-container |
| surface | `#f9faf0` | Header background |
| surface-container-lowest | `#ffffff` | Cards |
| surface-container-high | `#e7e9df` | Chips, tags |
| on-surface | `#191d16` | Body text |
| on-surface-variant | `#42493c` | Secondary text |
| outline | `#73796b` | Icons, placeholders |
| outline-variant | `#c2c9b8` | Borders |
| linen | `#fbf9f8` | Page background |
| gold-accent | `#fed65b` | Phase accent border |

## Phase colors

| Phase | Hex |
|-------|-----|
| 1 | `#8397b8` |
| 2 | `#735c00` |
| 3 | `#4b5f7e` |
| 4 | `#ba1a1a` |
| 5 | `#334865` |
| 6 | `#e9c349` |
| 7 | `#021a35` |
| 8 | `#574500` |

## Effects

- `grace-shadow`: `0 4px 20px rgba(26, 47, 75, 0.06)`
- Cards: `rounded-xl`, `border-l-4` accent
- Bottom nav: `rounded-t-xl`, active pill `bg-secondary-container`

## Navigation (5 tabs)

Today · Calendar · Journal · Progress · Settings

Phases is a secondary screen linked from overview CTAs.
