# Horizon OS — Design System

Generated from the live token system (`src/styles/horizon-tokens.css`, `tailwind.config.js`). Use
these; do not invent parallel values.

## Register

Product (the design serves the tool). Full-width operator cockpit, light theme.

## Theme

Light. The operator works long focused sessions on a wide monitor in a normally-lit room and needs
high legibility and density over mood. Surfaces are warm off-white tinted toward the brand blue/green,
never pure `#fff` or `#000`.

## Color (existing tokens)

- Primary (blue): `#2558d8` — primary actions, active nav, links.
- Signal (green): `#087861` — money-in, positive, "live" status.
- Brass (amber): `#9a6500` — attention, eyebrows, pending/inbox.
- Rust/coral: `#ba4d35` — money-out, risk, decisions due.
- Surfaces: background `#fbfff9`, surface `#fff`, surfaceVariant `#eef7ef`, surfaceContainer `#e7f1e8`.
- Outlines: outlineVariant `#dbe5dc` (1px full borders only).
- Strategy: Restrained. Tinted neutrals + blue primary; green/amber/rust as semantic accents only.

## Typography

- Display: Fraunces (serif) for screen titles and hero.
- Body: Manrope.
- Mono: IBM Plex Mono for labels, eyebrows, metrics, coordinates (uppercase, tracked).
- Hierarchy by scale + weight (black/extrabold for numbers, mono micro-labels).

## Layout

- Full-width app shell: left rail (collapsible) + `minmax(0,1fr)` main. No `max-w-7xl` page wrappers.
- Panels use the `Panel`/`.glass` component on `--hz-panel-*` tokens. Radius scale `--hz-radius-*`.
- Vary spacing for rhythm; avoid uniform identical card grids (see bans).

## Motion

- Framer Motion route fade/slide already in `Shell`. Ease-out only, no bounce. Do not animate layout props.

## Bans (from impeccable, enforced here)

- No side-stripe (`border-left/right` accent) cards. Use full 1px borders, tints, or leading icons/numbers.
- No gradient text, no decorative glassmorphism beyond the existing `.glass` panel.
- No hero-metric gradient template, no identical repeated icon-card grids, no nested cards.
- No em dashes in UI copy.
