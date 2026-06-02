# PlantSage — MVP Design Prompts
# For: Claude Design · Google Stitch · Figma AI · v0
# Paste DESIGN SYSTEM first, then any screen prompt

---

## DESIGN SYSTEM CONTEXT BLOCK
## Paste this at the top of every prompt session

```
App: PlantSage — Pokémon GO for plants. GPS-anchored botanical knowledge.
Platform: Android (primary), iOS
Publisher: Antharmaya Labs

PALETTE (strict — never deviate):
  Background:   #07090a   (near black, slight green tint)
  Surface:      #0c0f0d   (cards, sheets)
  Surface-2:    #111510   (elevated cards)
  Forest:       #1a3a1e   (primary green — headers, buttons, signs)
  Forest-deep:  #0d1f0f   (map base, card backs)
  Cream:        #f0ebe0   (species cards, text on dark)
  Amber:        #c8943a   (GPS dot, XP bar, rarity-rare, CTAs)
  Amber-light:  #e8b84b   (highlights, glows)
  Leaf:         #4a7c4a   (rarity-common, live indicators, success)
  Ancient:      #9b7fe8   (rarity-legendary, classical text layer)
  Stone:        #8c7b6b   (secondary text, muted labels)
  Error:        #c84a4a   (warnings, toxic plant flags)

TYPOGRAPHY:
  Display:   Syne ExtraBold 800   — species names, screen titles, numbers
  Body:      Lora Regular/Italic  — descriptions, folk uses, quotes
  Telugu:    Noto Serif Telugu 700 — all Telugu text
  Code/Meta: Fira Code Regular    — GPS coords, tags, metadata, badges

SPACING: 8px base grid. Padding: 16px screen, 12px cards.
Radius: 4px cards, 8px bottom sheets, 24px FABs, 99px pills.
No Material drop shadows. Distinction via background color shift only.

RARITY VISUAL SYSTEM:
  Common    → #4a7c4a leaf green   — solid dot + green rim
  Rare      → #c8943a amber        — glowing rim + amber badge
  Ancient   → #9b7fe8 violet       — violet rim + shimmer
  Legendary → white flash → gold   — full-screen reveal animation

SAGE LEVEL PROGRESSION:
  Observer → Documenter → Scholar → Vaidya → Sage
  Each level: distinct color, icon, privileges unlocked

BOTTOM NAV: 3 icons only. No labels. Icons: Map / Camera / Atlas
FAB: Amber circle, camera icon, center of bottom nav (raised)
STATUS BAR: Transparent. Light icons on dark background.
```

---

## SCREEN 01 — SPLASH / LOADING

```
Design a mobile app splash screen for PlantSage.

Background: full bleed #07090a near-black.
Center: the Wrightia tinctoria flower — a 5-petal botanical line illustration,
each petal elongated oval with a visible midrib vein and two lateral veins,
drawn in pure white SVG line art, 96px diameter, centered on screen.

Below flower: "PlantSage" in Syne ExtraBold 800, 28px, white, letter-spacing -0.02em.
Below that: "Hariharakhona · #001" in Fira Code Regular, 11px, #c8943a amber,
letter-spacing 0.2em, uppercase.

Bottom 20% of screen: a very subtle upward gradient from #0d1f0f to transparent,
suggesting forest floor.

Bottom center: thin amber loading bar, 48px wide, 1.5px tall, animating left to right,
8px from screen bottom. No text below it.

Status bar: transparent. No back button. No other UI elements. Extremely minimal.
Feel: sacred, intentional, like entering a temple forecourt.
```

---

## SCREEN 02 — ONBOARDING — PAGE 1 (WELCOME)

```
Design first onboarding screen for PlantSage mobile app. Full bleed dark design.

Background: #0d1f0f deep forest green, full screen.
Subtle texture: very faint grain/noise overlay at 4% opacity.

Top 35% of screen: pure dark space with the Wrightia 5-petal botanical line
illustration centered, white, 80px. Below it a 1px horizontal line #1a3a1e, 40px wide.

Center text block:
  Line 1: "The forest has been" — Lora Regular Italic, 22px, #f0ebe0 cream
  Line 2: "waiting." — Lora Regular Italic, 22px, #c8943a amber
  16px gap
  Line 3: "You are about to become its" — Fira Code 11px, #8c7b6b stone, letter-spacing 0.06em
  Line 4: "first Guardian." — Fira Code 11px, #c8943a amber, letter-spacing 0.06em

Bottom area:
  Full-width button, 16px margin each side, 52px tall, 4px radius.
  Background: #1a3a1e forest green. Text: "Begin" Syne SemiBold 600, 15px, #f0ebe0.
  No shadow. Just border 1px #2d5a32 subtle.

  Below button, 12px gap:
  4 progress dots — first amber filled circle 6px, other three #1a3a1e outlined circles 6px,
  spaced 8px apart, centered.

No skip button. No back. Immersive.
```

---

## SCREEN 03 — ONBOARDING — PAGE 2 (GPS DETECT)

```
Design GPS detection onboarding screen for PlantSage mobile app.

Background: #07090a full bleed.

Center of screen:
  3 concentric expanding circles, amber #c8943a.
  Innermost: 24px diameter, opacity 0.9, solid.
  Middle: 56px diameter, opacity 0.5, 1px stroke.
  Outer: 96px diameter, opacity 0.2, 1px stroke.
  (Static design — animation implied by the design)
  
  Below circles, 24px gap:
  "Detecting your location..." — Fira Code 11px, #c8943a, letter-spacing 0.12em, uppercase.

Bottom area:
  GPS coordinates placeholder: "13.7123°N · 79.7137°E"
  Fira Code 13px, #8c7b6b stone, centered.
  
  4px below: "Srikalahasti · Tirupati District · AP"
  Fira Code 10px, #5a7a5a even more muted, centered.

  Progress dots: second dot now amber, others outlined.
  
Absolutely no other UI. The waiting is the design.
```

---

## SCREEN 04 — ONBOARDING — PAGE 3 (NAME YOUR FOREST)

```
Design forest registration screen for PlantSage mobile app.

Background: #07090a.
Top: back arrow top-left, white, 40px touch target.

Content block centered vertically:
  
  "What do you call" — Lora Italic 20px, #f0ebe0, centered
  "this place?" — Lora Italic 20px, #c8943a, centered
  
  32px gap.
  
  Text input field:
    No background fill, no box. Just bottom border 1.5px #c8943a.
    Placeholder: "e.g. Hariharakhona" in #5a7a5a stone italic.
    Input text style when typed: Fira Code 15px #f0ebe0.
    Cursor: amber blinking line.
    No label above, no error text below.
  
  24px gap.
  
  Terrain type selector — 4 pill chips in a row:
    HILL · FOREST · RIVERBANK · PLAIN
    Fira Code 10px, letter-spacing 0.12em, uppercase.
    Unselected: transparent bg, 1px #2d5a32 border, #8c7b6b text.
    Selected (HILL highlighted): #1a3a1e bg, 1px #4a7c4a border, #f0ebe0 text.
    32px tall pills, 12px horizontal padding, 8px gap between.
  
  24px gap.
  
  Badge: "#001" — Syne Bold 32px #c8943a, centered.
  Below: "First guardian of this forest" — Fira Code 10px #8c7b6b, centered.

Bottom:
  "Continue" button — same style as Screen 02.
  Progress dots: third dot amber.
```

---

## SCREEN 05 — ONBOARDING — PAGE 4 (CONFIRMATION)

```
Design forest confirmation/success onboarding screen for PlantSage.

Full bleed background: #1a3a1e forest green (the only screen with full green bg).

Top section (40% of screen):
  "Hariharakhona" — Syne ExtraBold 800, 38px, white, centered, letter-spacing -0.02em.
  Below: "#001 · GUARDIAN: You" — Fira Code 12px, #c8943a, centered, letter-spacing 0.15em.

Center: a small map thumbnail card.
  200px wide × 120px tall, 4px radius.
  Satellite imagery style: dark green terrain, showing a hill outline.
  Amber GPS pin marker at center.
  Thin #2d5a32 border on the card.
  No controls, no labels on the map itself.

Below map:
  "147 known species await documentation." — Lora Italic 14px, rgba(240,235,224,0.7) cream, centered.

Bottom area:
  Large CTA button: 16px margins, 56px tall.
  Background: #f0ebe0 cream. Text: "Enter the forest" Syne SemiBold 600, 15px, #1a3a1e forest.
  No icon. Full width minus margins.
  
  Progress dots: all four amber filled — onboarding complete.
  
Feel: ceremonial. You just registered your territory.
```

---

## SCREEN 06 — MAP (HOME SCREEN)

```
Design the home/map screen for PlantSage mobile app. This is the game world.

Full bleed satellite map background — dark forest green terrain,
hill outline visible (Hariharakhona), Swarnamukhi river edge on the right.
Map is the entire screen. No app bar. No status bar overlay.

USER GPS DOT (center-ish):
  Inner solid white circle 10px diameter.
  Around it: amber #c8943a expanding pulse ring (shown at 50% expansion),
  opacity 0.6, 32px diameter. Second larger ring 56px diameter, opacity 0.2.
  
TRAIL behind user GPS (implied by static design):
  A amber polyline 2px wide, opacity 0.7, snaking from lower-left up toward current position.
  Recent 50m segment slightly brighter (opacity 1.0).
  Represents morning's walk so far.

SPECIES HOTSPOT DOTS (3-4 visible on map):
  Documented: small filled leaf-green circles 12px, slight inner glow.
  Labels: small cream pill beside each showing plant name in Fira Code 10px.
  e.g. "Wrightia tinctoria", "Cassia fistula", "Anogeissus latifolia"
  Undiscovered: smaller outlined pulsing green circles with "?" center.

UNDISCOVERED FOG:
  Semi-transparent dark overlay (#000 at 35% opacity) on the upper-right section
  of the map where user hasn't walked. Soft gradient edge. Not hard clipped.

TOP-RIGHT CONTROLS (floating, no background):
  Stack of two small icon buttons, 40px touch targets, white icons:
  - Layer toggle (satellite/map switch) — top
  - Compass/North indicator — below

BOTTOM STATUS BAR:
  Fixed above bottom nav. 52px tall. Full width.
  Background: rgba(13,26,15, 0.92) with blur.
  Left: amber dot 8px + "HARIHARAKHONA" Fira Code 10px #c8943a + "· 3 undiscovered" #8c7b6b.
  Right: GPS signal indicator — 3 vertical bars, green, full signal.

BOTTOM NAV:
  Background: rgba(7,9,10,0.96). 64px tall. Border-top 1px rgba(255,255,255,0.07).
  3 icons with amber FAB raised center:
  Left: map/location outline icon — ACTIVE state (amber color)
  Center: amber circle FAB 56px raised 8px above nav, camera icon white, shadow.
  Right: grid/atlas icon — inactive (stone color)
  No labels under icons.
```

---

## SCREEN 07 — CAMERA / IDENTIFY

```
Design the plant identification camera screen for PlantSage mobile app.

Full bleed camera preview. Background implied as a lush green rocky hillside plant scene
(simulate what the camera would see at Hariharakhona — Wrightia tinctoria leaves
with white star flowers, shot close up, natural light).

OVERLAY ELEMENTS:

Corner brackets (4 corners):
  Each is an L-shape, amber #c8943a, 20px arms, 2px width.
  Top-left, top-right, bottom-left, bottom-right corners of a centered 200×200px zone.

Scanning line:
  Horizontal line 1px height, within the corner bracket zone.
  Gradient: transparent → #e8b84b → transparent (center peak).
  Shown at 40% down from top of zone (mid-scan position).

TOP BAR (transparent, no background):
  Back arrow — top-left, white icon, 40px touch target.
  "IDENTIFY" — top-center, Fira Code 11px #f0ebe0, letter-spacing 0.2em, uppercase.
  Flash toggle — top-right, white icon.

CENTER INSTRUCTION:
  Below the bracket zone, 16px gap:
  "Aim at leaf, flower, or bark" — Lora Italic 13px, rgba(240,235,224,0.7).

BOTTOM CAPTURE AREA (no background):
  Center: full-screen tap zone (implied, shown as very subtle tap ripple indicator).
  Bottom row: 
  - Left 1/3: small thumbnail of last captured photo, 48px circle, 1px amber border.
  - Center 1/3: large shutter button — white circle 72px, amber outer ring 80px, 3px.
  - Right 1/3: camera flip icon, white, 40px touch target.

TRAIL SECTION BADGE (bottom of screen above bottom row):
  Pill badge: #1a3a1e background, 1px #2d5a32 border.
  "📍 Wrightia Corridor · Section 2" — Fira Code 10px #c8943a.
  (Shows which trail zone you're in based on GPS)
```

---

## SCREEN 08 — CAMERA — PROCESSING STATE

```
Design the "identifying plant" loading state screen for PlantSage camera.

Background: blurred version of whatever camera just captured (plant image, blurred 20px).
Semi-transparent overlay: rgba(7,9,10,0.75) over blurred image.

Center:
  Circular progress indicator — amber #c8943a, 48px diameter, 3px stroke.
  Animating arc (show as 70% arc, implying loading).

  Below, 20px gap:
  "Identifying..." — Lora Italic 18px, #f0ebe0.

  Below, 8px gap:
  "Searching 8 knowledge domains" — Fira Code 10px, #8c7b6b, letter-spacing 0.08em.

STEP INDICATORS (4 steps shown below):
  16px gap below subtitle.
  Vertical list, left-aligned within a centered 200px container:
  ✓ "Plant visual ID" — Fira Code 11px leaf green — done
  ● "Ayurvedic classification" — amber, pulsing dot — in progress  
  ○ "Folk medicine (AP tribes)" — stone — pending
  ○ "Classical text search" — stone — pending

  Each line: 8px dot + 8px gap + text. 8px vertical gap between lines.

TOP: back/cancel — top-left, "Cancel" in Fira Code 11px, stone color.
No bottom nav visible.
```

---

## SCREEN 09 — CARD REVEAL — RARITY MOMENT

```
Design the species card reveal screen for PlantSage mobile app.
This is the most important UX moment. It must feel earned.

Background: #0d1f0f full bleed deep forest.

THE CARD (center, slightly above center):
  280px wide × 380px tall. 4px border radius.
  
  CARD FACE showing (post-flip state):
  
  TOP HALF — Image zone (160px):
    Full-width species photo — Wrightia tinctoria white star flowers in sunlight,
    lush, beautiful, naturally lit. Rounded top corners matching card.
    Bottom of image fades to cream via gradient.
    
    TOP-LEFT OVER IMAGE: rarity badge pill.
      "RARE" — Fira Code 9px — #c8943a amber text — background rgba(200,148,58,0.2)
      border 1px #c8943a — 4px radius — 6px × 18px padding.
    
    TOP-RIGHT OVER IMAGE: "#007" — Fira Code 9px #f0ebe0 with amber outline circle.

  RARITY STRIP: full-width 3px bar between image and content — amber #c8943a.
  
  BOTTOM HALF — Content (cream #f0ebe0 background):
    Padding 16px.
    
    "Wrightia tinctoria" — Syne Bold 700, 18px, #1a3a1e forest.
    "అడవిపాల" — Noto Serif Telugu 700, 17px, #2d5a32 forest-mid. 4px below.
    
    Metadata row (8px below name):
    "APOCYNACEAE · COMMON · SESHACHALAM" — Fira Code 9px, #8c7b6b, letter-spacing 0.08em.
    
    Hairline divider: 1px, rgba(26,58,30,0.15). 12px vertical margins.
    
    First folk use snippet:
    "Bark paste applied for skin disease" — Lora Italic 13px, #5a7a5a stone. 2 lines max.

CARD GLOW:
  Outer glow around entire card: amber #c8943a, blur 24px, opacity 0.4.
  (Simulating the rarity rim light effect post-reveal)

BACKGROUND PARTICLE EFFECT (subtle):
  4-5 small amber dots/particles around the card, varying sizes 2-4px,
  as if just burst from the card. Low opacity 0.3.

BOTTOM ACTIONS (below card):
  24px gap.
  Full-width button: "Add to Atlas" — Syne SemiBold 600, 14px.
  Background #1a3a1e, text #f0ebe0, 52px tall, 16px margins.
  
  Below: "See full knowledge →" — Lora Italic 13px, #c8943a amber, centered text link.
```

---

## SCREEN 10 — SPECIES KNOWLEDGE CARD (FULL)

```
Design the full species knowledge screen for PlantSage mobile app.
This is the psychonaut-wiki equivalent for plants. Scrollable.

HEADER (non-scrolling, 280px tall):
  Full bleed species image — Wrightia tinctoria flowers, beautiful natural light.
  Gradient overlay: transparent top 40% → #07090a bottom.
  
  Over gradient (bottom-left):
    "Wrightia tinctoria" — Syne Bold 700, 22px, white.
    "అడవిపాల" — Noto Serif Telugu 700, 18px, white, 4px below.
    Amber rarity pill "COMMON · APOCYNACEAE" — Fira Code 9px.
  
  Over gradient (bottom-right):
    Guardian crown icon — gold, 20px.
    "You are the Guardian" — Fira Code 9px, #c8943a, below crown.
  
  Top-left: back arrow, white, semi-transparent circle bg.

TAB ROW (sticky, 48px tall):
  Background rgba(7,9,10,0.96). Border-bottom 1px rgba(255,255,255,0.07).
  5 tabs: FIELD · USES · AYURVEDA · ANCIENT · HOW TO
  Fira Code 10px, letter-spacing 0.12em, uppercase.
  Active tab: amber text + 2px amber underline.
  Inactive: stone color.
  Scrollable if needed.

FIELD TAB CONTENT (what's visible on first load, show this):
  
  Section: "Where to find it" — Fira Code 10px amber header.
  Body: "Rocky scrubland slopes, 200-600m altitude. Found in Wrightia Corridor
  section of Hariharakhona, at base of granite outcrops facing east. Currently
  in full bloom — prime identification window." — Lora Regular 14px, stone. 
  
  16px gap.
  
  Section: "Field ID marks" — Fira Code 10px amber.
  3 chip tags: "5-petal white star" · "milky latex when cut" · "opposite oval leaves"
  Each: #111510 bg, 1px #2d5a32 border, Fira Code 10px #f0ebe0, 8px radius.
  
  16px gap.
  
  Section: "Season" — Fira Code 10px amber.
  Horizontal month timeline bar:
    12 months Jan-Dec, each 24px wide column.
    Flowering season (Mar-Jun): amber filled.
    Other months: #1a3a1e dim fill.
    Fruit season (Jul-Sep): leaf green.
    Labels: J F M A M J J A S O N D, Fira Code 9px stone below bar.
  
  16px gap.
  
  Section: "Associated species on this trail" — Fira Code 10px amber.
  3 small horizontal plant cards: Cassia fistula · Anogeissus latifolia · Ficus benghalensis.
  Each: 80px × 48px, surface-2 bg, plant name Fira Code 9px cream, tappable.

BOTTOM: Same 3-tab nav. Back to map icon left. FAB amber center (re-photograph).
```

---

## SCREEN 11 — ATLAS (SPECIES POKÉDEX)

```
Design the species atlas screen for PlantSage mobile app.

HEADER (collapsing, shown expanded):
  Background: #07090a. Transparent status bar.
  
  "ATLAS" — Syne ExtraBold 800, 52px, white. Left aligned, 16px left padding.
  "HARIHARAKHONA #001" — Fira Code 11px, #c8943a amber, below. Left padded.
  
  Right side of header:
    "12" — Syne Bold 700, 36px, amber.
    "/200" — Syne Regular 400, 18px, stone. Inline.
    "DOCUMENTED" — Fira Code 9px stone, below.

FILTER CHIPS ROW (sticky below header, horizontally scrollable):
  Background #07090a. Border-bottom 1px rgba(255,255,255,0.05). 48px tall. 16px start padding. 8px gap between chips.
  Chips: ALL · COMMON · RARE · ANCIENT · LEGENDARY · GUARDIAN
  ALL selected: amber bg, forest text, Fira Code 10px.
  Others: transparent bg, stone border 1px, stone text.
  32px tall chips, 12px horizontal padding.

STATS ROW (below filter chips):
  4 mini stat blocks in a horizontal row, each 1/4 width, center-aligned, 12px padding top/bottom.
  Background: #0c0f0d. Border-bottom 1px rgba(255,255,255,0.04).
  
  [12] DOCUMENTED | [3] RARE | [1] ANCIENT | [2] GUARDIAN
  Number: Syne Bold 700, 20px, amber.
  Label: Fira Code 9px, stone, below.

GRID (3 columns, 4px gap):

  DOCUMENTED SPECIES CELLS (show 6 filled, 6 locked):
  Square aspect ratio. Show species thumbnail image covering full cell.
  Bottom gradient overlay.
  Bottom-left: 3px × 16px rarity color strip (leaf green = common, amber = rare).
  If Guardian: small crown icon top-right, gold, 16px.
  
  Examples of filled cells:
    Cell 1: Wrightia tinctoria — white flowers, leaf strip, no crown.
    Cell 2: Cassia fistula — golden pods, amber strip (RARE).
    Cell 3: Anogeissus latifolia — white trunk shot, leaf strip, crown icon.
  
  UNDISCOVERED CELLS (locked):
    Background: #0d1f0f.
    Center: ? mark, 24px, opacity 0.15, leaf green color.
    Subtle border animation implied: 1px leaf green, low opacity.
    No tap affordance.
  
  LEGENDARY LOCKED CELL (one visible):
    Background: rgba(155,127,232,0.08).
    Center: ★ star mark instead of ?, ancient violet color, opacity 0.2.

BOTTOM NAV: 3 icons. Atlas/grid icon active (amber). Camera FAB center. Map icon left inactive.
```

---

## SCREEN 12 — SAGE PROFILE

```
Design the sage profile screen for PlantSage mobile app.

Background: #07090a. No app bar. Status bar transparent.

TOP SECTION (profile identity):
  
  64px circle avatar — gradient background diagonal: #1a3a1e to #c8943a.
  Initials "N" in Syne Bold 700, 28px, white. Top-center, 48px from top.
  
  "Nagi" — Syne Bold 700, 20px, white. Centered, 12px below avatar.
  "Guardian of Hariharakhona #001" — Fira Code 11px, #c8943a. 4px below.
  
  Stats row (16px below):
  3 pill chips in a row, centered with 8px gaps:
    [12 SPECIES] · [34 DAYS] · [2 GUARDIAN]
    Each: #111510 bg, 1px #1a3a1e border, 36px tall.
    Number: Syne Bold 700, 16px, amber. Label: Fira Code 9px, stone, below in same pill.

SAGE LEVEL SECTION (24px below stats):
  Full-width card, #0c0f0d bg, 1px rgba(255,255,255,0.06) border, 12px padding, 4px radius.
  
  Row: "SCHOLAR" — Fira Code 12px, #c8943a, letter-spacing 0.25em, left.
  Right same row: "LVL 3" — Syne Bold 700, 16px, amber.
  
  "Document 50 species to advance to Vaidya" — Lora Italic 12px, stone. 8px below.
  
  XP progress bar (12px below):
    Full width minus 24px. 8px tall. #1a3a1e track.
    Fill 60%: gradient #4a7c4a → #c8943a. Rounded ends.
    "38 / 50 SPECIES" — Fira Code 10px, stone, right-aligned below bar.

STREAK SECTION (20px below):
  Label: "MORNING SESSIONS" — Fira Code 11px stone, letter-spacing 0.15em.
  
  Big number row: 
    Flame emoji 🔥 (or Lottie fire icon) — 32px, left of number.
    "34" — Syne ExtraBold 800, 56px, #c8943a amber. Centered.
    "DAYS" — Fira Code 12px, stone, below "34", centered.
  
  Milestone timeline (below streak):
    4 dots connected by a line. Left to right: 7d · 30d · 100d · 365d.
    First two: amber filled circles (unlocked). Next two: stone outlined.
    Labels below each dot in Fira Code 9px:
    7d="Early Riser" · 30d="Ayurveda Tier" ✓ · 100d="Ancient Texts" (locked) · 365d="Sage"
    Amber line connecting the first two. Stone dashed line rest.

KNOWLEDGE TIERS (20px below):
  3 rows, each 56px tall, 1px border-bottom rgba(255,255,255,0.04).
  
  Row 1 — ACTIVE: 3px left border, leaf green. 
    Left: leaf icon 20px leaf green. Middle: "Ayurveda Layer" Syne 600 14px white.
    "Active — 30 day streak" Fira Code 10px stone below.
    Right: "ACTIVE" Fira Code 9px leaf green pill badge.
  
  Row 2 — LOCKED: 3px left border, stone.
    Left: book icon 20px stone opacity 0.4. Middle: "Classical Texts" Syne 600 14px stone.
    "Unlocks at 100 days" Fira Code 10px stone below.
    Right: "LOCKED" Fira Code 9px, stone, outlined pill.
  
  Row 3 — LOCKED: same style. "Community Validation" · "Unlocks at 50 species".

BOTTOM: 3-tab nav. Profile/person icon active amber. Camera FAB center. Map icon.
```

---

## SCREEN 13 — SETTINGS

```
Design the settings screen for PlantSage mobile app.

Background: #07090a. App bar: "Settings" in Syne Bold 700, 18px, white.
Back arrow top-left. No FAB.

Content: scrollable list of setting groups. Each group has a Fira Code 10px header
in amber, letter-spacing 0.2em, uppercase. Groups separated by 24px gap.

GROUP 1 — FOREST
  "FOREST"
  List item: "Hariharakhona #001" — Syne 600 15px white + "Active region" Fira Code 10px stone.
  Arrow icon right. Bottom: 1px divider rgba(255,255,255,0.04).
  
  List item: "Add a new forest" — Lora 14px #c8943a. Arrow right.

GROUP 2 — IDENTIFICATION
  "IDENTIFICATION"
  Toggle row: "Auto-identify on capture" — Syne 600 14px white.
  Sub: "Sends photo immediately on capture" — Fira Code 10px stone.
  Toggle right: ON state (amber filled switch).
  
  Toggle row: "Offline photo queue" — enabled.
  Sub: "Queue photos when no signal, sync later".
  Toggle: ON (amber).
  
  List item: "AI Model preference" → "Gemini 2.5 Flash" + arrow.
  
  List item: "Confidence threshold" → "70%" + arrow.

GROUP 3 — NOTIFICATIONS
  "NOTIFICATIONS"
  Toggle: "Research complete" — ON.
  Toggle: "New species nearby" — ON.
  Toggle: "Community discoveries" — OFF (stone inactive switch).
  Toggle: "5:30am session reminder" — ON. Sub: "Daily at 5:30 AM".

GROUP 4 — DATA & SYNC
  "DATA & SYNC"
  List item: "Sync interval" → "On signal restore" + arrow.
  List item: "Local storage used" → "248 MB" + arrow.
  List item: "Export my atlas" → Lora italic 13px amber. Arrow.
  List item: "Clear cache" → #c84a4a error red text.

GROUP 5 — ABOUT
  "ABOUT"
  List item: "PlantSage · Antharmaya Labs"
    Sub: "v1.0.0 · Build 42 · Hariharakhona Pilot"
  List item: "Vanaprastha Protocol" → "What is this?" amber arrow.
  List item: "Privacy policy" stone arrow.
  List item: "Open source licenses" stone arrow.

All list items: 56px tall, 16px left padding. Surface-2 on pressed. No visible card bg.
```

---

## SCREEN 14 — NOTIFICATION (SYSTEM + IN-APP)

```
Design two notification variants for PlantSage.

VARIANT A — Android system push notification (shown on lock screen):
  Notification card with amber left accent bar.
  
  Header row: PlantSage icon (Wrightia flower on forest green, 40px circle) + "PlantSage" 
  app name Syne 600 13px + "2 min ago" Fira Code 10px stone right.
  
  Title: "🌿 అడవిపాల · RARE" — Syne Bold 700, 15px, dark.
  Body: "Your knowledge card is ready. 6 folk uses documented. First discovery in your region."
  Fira Code 11px, dark, 2 lines.
  
  Below body: 2 action buttons side by side.
  "View Card" (amber text) · "Dismiss" (stone text). Fira Code 11px.

VARIANT B — In-app notification banner (slides down from top when app is open):
  Full width. 72px tall. Background rgba(13,26,15,0.97) with blur.
  Left: amber vertical bar 3px full height.
  
  Wrightia flower icon 32px circle (forest bg, white SVG) — 12px from left.
  
  Right of icon:
    "అడవిపాల identified" — Syne Bold 600, 14px, white.
    "RARE · 6 folk uses · Tap to reveal" — Fira Code 10px, #c8943a.
  
  Right edge: "→" white arrow icon, 24px, centered vertically.
  
  Entire banner tappable → navigates to card reveal.
  
  Show the banner sliding down from top with subtle amber bottom edge glow.
```

---

## SCREEN 15 — COMMUNITY FEED (DISCOVERY FEED)

```
Design the community discovery feed screen for PlantSage mobile app.

This screen shows what other users across all PlantSage regions have discovered recently.
Access: swipe right on map screen OR tab in bottom nav (optional 4th tab, shown as pulse/activity icon).

HEADER:
  "DISCOVERIES" — Syne ExtraBold 800, 28px, white. Left 16px. 
  "Across all forests · Live" — Fira Code 10px, #c8943a, letter-spacing 0.1em.
  Live indicator: small pulsing green dot 6px beside "Live".
  
  Region filter chips (horizontal scroll, 40px below header):
  "ALL REGIONS" · "HARIHARAKHONA #001" · "NILGIRIS #002" · "SESHACHALAM #003"
  Same chip style as atlas filter row.

FEED CARDS (scrollable, 12px gap, 16px side padding):

Card type 1 — Standard discovery:
  Card: #0c0f0d bg, 1px rgba(255,255,255,0.06) border, 8px radius.
  
  TOP ROW:
    Left: user avatar 36px circle (gradient) + "Nagi · Hariharakhona" Syne 600 13px white inline.
    Below username: "2 minutes ago" Fira Code 10px stone.
    Right: rarity badge "RARE" amber pill.
  
  SPECIES IMAGE: full width of card, 160px tall, rounded corners 4px at top of image,
  species photo — Wrightia tinctoria flowers.
  Rarity strip 3px amber across bottom of image.
  
  CONTENT:
    16px padding.
    "Wrightia tinctoria" — Syne Bold 700, 17px, white.
    "అడవిపాల" — Noto Serif Telugu 700, 15px, #4a7c4a leaf. Inline beside English.
    
    "Trail section: Wrightia Corridor · 13.7124°N 79.7138°E"
    Fira Code 10px, stone. 8px below names.
    
    First folk use as quote:
    "\"Bark paste applied to skin lesions — documented by Yanadi community\""
    Lora Italic 13px, stone. 8px below coords. Max 2 lines.
  
  ACTION ROW (16px padding, border-top 1px rgba(255,255,255,0.04)):
    "👋 Knowledge confirmed" — Fira Code 11px stone, left.
    "3 confirmations" — stone right.

Card type 2 — Legendary find (special treatment):
  Same structure but:
  Background: rgba(155,127,232,0.06) tinted.
  Border: 1px rgba(155,127,232,0.3).
  Top: "⭐ FIRST EVER DOCUMENTED · LEGENDARY" — Fira Code 10px violet, centered, 8px top.
  Rarity strip: violet.
  Header badge: violet "LEGENDARY" pill.

BOTTOM NAV: standard 3 icons. Or show as 4th tab if feed is a main nav item.
```

---

## MASTER PROMPT (for full app overview, Google Stitch / single-shot)

```
Design a complete mobile app UI for PlantSage — a Pokémon GO-style 
botanical knowledge app for discovering medicinal plants in forest terrain.

Design system:
- Dark theme throughout: primary background #07090a (near-black, slight green tint)
- Accent colors: forest green #1a3a1e, amber #c8943a, leaf green #4a7c4a, violet #9b7fe8
- Typography: Syne ExtraBold for display, Lora Italic for body, Fira Code for metadata
- Telugu language support: Noto Serif Telugu for plant names
- No drop shadows. Color shifts for elevation. 
- Bottom nav: 3 icons (Map, Camera FAB center raised, Atlas grid). No labels.
- Rarity system: Common=green, Rare=amber, Ancient=violet, Legendary=white flash

Show all screens in one flow:
1. Dark splash with botanical flower illustration
2. Onboarding: GPS detect → name your forest → "You are Guardian #001" confirmation
3. Home map: satellite imagery, amber GPS dot with pulse, amber trail polyline, 
   green species hotspot dots, dark fog on undiscovered areas, "3 undiscovered" status bar
4. Camera: plant closeup, amber corner brackets, horizontal scan line
5. Loading state: concentric circles, step-by-step progress "Ayurveda classification..."  
6. Card reveal: 3D flip showing species card with amber rim glow, particle burst
7. Species card: hero image + "Wrightia tinctoria / అడవిపాల", tab navigation 
   FIELD USES AYURVEDA ANCIENT HOW TO
8. Atlas: 3-column grid, documented species (thumbnails) + undiscovered (dark with ?)
9. Sage profile: avatar, "SCHOLAR LVL 3", 34-day streak with flame, XP bar, tier unlocks
10. Settings: grouped list, forest region, notification toggles, data sync
11. Community feed: discovery cards with species photos, user attribution, GPS coords
12. System push notification: amber accent, Telugu species name, "View Card" action

The app should feel like an adventure game meets ancient Indian knowledge system.
Every screen should make you want to walk deeper into the forest.
Target: mid-range Android (Samsung Galaxy A series). Clean, premium, purposeful.
```

---

## AGENT HANDOFF NOTE

```
These prompts are optimized for:
- Claude Design (design mode) — use individual screen prompts
- Google Stitch — use MASTER PROMPT for full overview
- Figma AI — use individual prompts per frame
- v0.dev — adapt for React Native web preview

Stack context for any coding agent:
Flutter · Dart · Riverpod · Isar · google_maps_flutter
Backend: FastAPI · Cloud Run · Cloud Tasks · Firebase FCM
Storage: Cloudflare R2 (prod) / MinIO (local)
DB: Supabase PostGIS + Isar (offline)
AI: Gemini 2.5 Flash (ID) + Gemini 2.5 Pro + Search grounding (research)
Publisher: com.antharmayalabs · Antharmaya Labs · Play Console live
Pilot region: Hariharakhona · 13.7123°N 79.7137°E · Srikalahasti AP
```
