# Horizon OS Design Tokens

## Rule

Horizon OS is a bright workflow tool. No dark default theme. Dark colors are allowed only as text or tiny contrast details, never as the main surface.

## Token Model

Inspired by Material 3:

1. Reference tokens
   - Raw palette values, such as Horizon blue, studio green, amber, coral, and neutral tones.

2. System tokens
   - Semantic roles, such as `primary`, `secondary`, `surface`, `surfaceVariant`, `outline`, and `onSurface`.

3. Component tokens
   - App-specific roles, such as panel background, panel border, focus ring, hover state, radius, and elevation.

## Files

- `src/styles/horizon-tokens.css`
- `src/index.css`
- `tailwind.config.js`

## Palette Direction

- Background: warm white and pale green surfaces.
- Primary: clear blue for command actions and active states.
- Secondary: green for operational status and progress.
- Tertiary: amber for public/OSS signal and attention.
- Coral: warning or risk accent.

## Component Rule

Every new UI block should use semantic tokens, not raw hex values, unless it is a canvas-rendered element that cannot reliably resolve CSS variables.

Use:

- `bg-surface`
- `bg-surfaceVariant`
- `bg-primary`
- `bg-primaryContainer`
- `text-paper`
- `text-onPrimary`
- `border-outlineVariant`

Avoid:

- app-wide dark backgrounds
- raw `black` utility surfaces
- one-off colors disconnected from the token set
