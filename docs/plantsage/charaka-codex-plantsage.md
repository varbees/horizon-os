# The Charaka Codex
### PlantSage.earth · Core Knowledge Artifact #001
### The founding framework for documenting Rayalaseema & the Eastern Ghats

> *"Goat herders, shepherds, cow herders and other forest dwellers know the plants by name and forms. Nobody can comprehend fully about the plants only by knowing their names or forms. He is the real knower of them who, after knowing the name and form, has got knowledge of their administration... He is the best physician who knows administration of these plants according to place and time and also keeping in view the individual constitution."*
>
> — **Charaka Samhita, Sutrasthana 1.120–123**

This single passage is the charter of PlantSage. Knowing a plant's *name* is iNaturalist. Knowing its *administration according to place and time* is PlantSage. Charaka drew that exact line 2000 years ago. We are building the tool he described.

Source text: *Charaka Samhita — Handbook on Ayurveda*, Vol I, edited by Gabriel Van Loon from P.V. Sharma's English translation (Chaukhambha Orientalia). 621 pages, 8 sections, 120 chapters. All citations below use the canonical `Section Chapter#Sutra` format so every claim in the app traces back to the source.

---

## PART 1 — WHY CHARAKA IS THE RIGHT SPINE

The Charaka Samhita is not a plant catalogue. It is a *system* for relating substance → quality → effect → person → place → time. That system is exactly the schema PlantSage needs, because it forces every plant entry to answer the questions that matter:

- What is it made of? (the 5 elements / mahabhutas)
- What does it taste like, and what does that predict? (the 6 rasas)
- What does it do in the body? (virya, vipaka, karma)
- Where does it grow, and what does that terrain mean? (the 3 lands)
- Who is it right for, and when? (constitution, season)

Map every Hariharakhona plant onto this and you don't have a list — you have *knowledge*, in Charaka's exact sense.

---

## PART 2 — THE TERRAIN CLASSIFICATION (this is the unlock)

Charaka classifies all land into **3 types** — and Hariharakhona is unambiguously one of them.

| Charaka land type | Sanskrit | Description (Ka1#8, Vi3#46-48) | Health profile |
|---|---|---|---|
| **Arid / Hilly** | **Jangala** | Little water, few trees, strong winds, intense sun, thin coarse rocky soil with sand and gravel | **Most healthy** — "least number of diseases" |
| Medium | Sadharana | Combined characters of the other two | Moderately healthy |
| Marshy | Anupa | Abundant water, numerous trees, mild air, scarce sun | Least healthy — "plenty of doshas" |

**Hariharakhona is Jangala terrain.** Read Charaka's description against your own photos: *"little water, few trees on the upper slopes, strong winds, intense sun, thin coarse rough soil with plenty of sand and gravels."* That is the granite ridge you're climbing Sunday, described in the Kalpasthana.

And critically — Charaka rates **Jangala as the *healthiest* land type**, producing the fewest diseases. The dry, sun-exposed, windswept hill you walk every morning is, in this system, the most health-giving terrain that exists. Your Vanaprastha instinct and the text agree.

### The Jangala plant list — Charaka names them (Ka1#8)

Charaka lists the trees characteristic of arid/Jangala land. Several you have **already photographed or will find** on Hariharakhona:

| Charaka name | Likely botanical | On Hariharakhona? |
|---|---|---|
| khadira | *Acacia catechu* | Expected — dry slope |
| dhava | *Anogeissus latifolia* | **✓ Photographed (Chittagi, pale trunk)** |
| asana | *Terminalia tomentosa* | Expected |
| sallaki | *Boswellia serrata* | Expected — rocky |
| badari | *Ziziphus* sp. | Likely — the silvery shrub candidate |
| tinduka | *Diospyros* sp. | Expected |
| asvattha | *Ficus religiosa* | **✓ Photographed (Ficus over granite)** |
| vata | *Ficus benghalensis* | **✓ Photographed** |
| amalaki | *Phyllanthus emblica* | Expected — sacred groves |
| simsapa | *Dalbergia sissoo* | Possible |

> **This is the spine of the artifact.** When a PlantSage user documents *Anogeissus latifolia* on Hariharakhona, the app shows: *"Charaka names dhava as a defining tree of Jangala (arid) land — Ka1#8. You are standing in the terrain the classical texts describe."* The plant, the place, and the 2000-year-old text lock together. No other plant app on earth does this.

---

## PART 3 — THE PHARMACOLOGY SCHEMA (every plant entry uses this)

This is the data model. Every species card in PlantSage gets a `charaka` object built on these five axes.

### Axis 1 — The 5 Elements (Mahabhutas) · Su1#56

`prthvi` (earth) · `ap` (water) · `agni` (fire) · `vayu` (air) · `akasha` (space)

Every substance is a ratio of these. The ratio determines taste, which determines action.

### Axis 2 — The 6 Tastes (Rasas) · Su26#9, Su1#65

Every plant is described by its dominant taste(s). Charaka: every substance contains all six in varying amounts. Taste is made primarily of water + earth, differentiated by the other three elements.

| Rasa | English | Element pair | Key actions (Su26#43) | In excess |
|---|---|---|---|---|
| **madhura** | sweet | earth + water | nourishing, builds tissue/ojas, cooling, alleviates pitta & vata, heals wounds | obesity, lethargy, kapha disorders |
| **amla** | sour | earth + fire | stimulates digestion, warming, carminative | blood/skin issues, acidity |
| **lavana** | salty | water + fire | digestive, moistening, laxative, relishing | baldness, greying, wrinkles, debility (Vi1#18) |
| **katu** | pungent | fire + air | digestive, clears channels, reduces kapha & fat | depletes virility, dryness |
| **tikta** | bitter | air + space | detoxifying, antipyretic, cleansing, reduces kapha & pitta | depletes tissue, weakness |
| **kasaya** | astringent | air + earth | healing, drying, absorbs, constricts | constipation, vata aggravation |

### Axis 3 — Virya (potency)

The heating or cooling energy of the plant. `ushna` (hot) or `shita` (cold). Determines how it shifts the body's thermal balance.

### Axis 4 — Vipaka (post-digestive effect)

What the substance becomes *after* digestion — sweet, sour, or pungent vipaka. Sometimes opposite to the raw taste. This is the long-term metabolic effect.

### Axis 5 — Karma & Prabhava (action & special effect)

`karma` = the documented actions (the verbs: purgation, emesis, healing, pacifying). `prabhava` = any unique effect not explained by the above (the "x-factor" of certain plants).

### Worked example — the schema applied to a real plant

Charaka, Su1#114-119, names plants by their useful parts. For example:

> **Snuhi** (*Euphorbia*, the candelabra succulent you photographed in image 4): *"latex of snuhi for purgation."* — Su1#114-115

So PlantSage's *Euphorbia* card gets:

```json
{
  "scientific_name": "Euphorbia caducifolia",
  "charaka": {
    "classical_name": "snuhi",
    "useful_part": "latex (ksheera)",
    "karma": ["virechana (purgation)"],
    "citation": "Su1#114-115",
    "safety": "Latex is a strong purgative and irritant. Charaka classes it among sharp latex-bearing plants — never self-administer.",
    "terrain_match": "jangala (arid) — consistent with rocky exposed Hariharakhona slope"
  }
}
```

This is the difference between "I saw a Euphorbia" and *knowing the plant in Charaka's sense.*

---

## PART 4 — THE THREE-FIELD TRUTH RULE (the trust moat)

Every plant entry in PlantSage keeps **three knowledge layers strictly separate**. This is what makes it trustworthy and not wellness misinformation. Never blur them.

```
┌─────────────────────────────────────────────────────────┐
│  FIELD 1 — CLASSICAL (cited, immutable)                  │
│  What Charaka / Sushruta / Bhavaprakasha actually say.   │
│  Always carries a sutra citation. e.g. "snuhi latex      │
│  for purgation — Su1#114". This is the documented record.│
├─────────────────────────────────────────────────────────┤
│  FIELD 2 — FOLK (attributed, sourced)                    │
│  What local communities (Yanadi, Yerukala, Chenchu)      │
│  actually practice. Always carries WHO said it, WHEN,    │
│  and exact preparation. Living oral knowledge.           │
├─────────────────────────────────────────────────────────┤
│  FIELD 3 — EMBODIED (personal, dated, non-prescriptive)  │
│  What YOU observed. "Prepared X on this date, noticed Y."│
│  Never presented as advice. First-person field record.   │
└─────────────────────────────────────────────────────────┘
```

A claim from one field may *never* migrate into another without its provenance. Charaka himself models this discipline — he constantly cites whether something is observed, inferred, or taught (Su1#120-123 distinguishes knowing a name from knowing administration). We inherit that rigor.

**Safety gate:** any plant with a `karma` of purgation, emesis, or any latex/toxic flag (snuhi, arka, asmantaka — Su1#114-115) renders with a hard safety banner and *never* shows a preparation method in the consumer view. Classical citation is shown; dosing is not.

---

## PART 5 — APP INTEGRATION ARCHITECTURE

How the Charaka Codex lives inside plantsage.earth.

### 5.1 — Ingestion (one-time pipeline)

```
Charaka PDF (621 pp)
   ↓  chunk by sutra reference (Su/Ni/Vi/Sa/In/Ci/Ka/Si + chapter + sutra)
   ↓  each chunk → {section, chapter, sutra, text, topic_tags}
   ↓  embed with text-embedding-004
   ↓  store in Supabase pgvector table: charaka_sutras
   ↓  build a classical_name → sutra_refs lookup index
```

### 5.2 — Auto-linking (on every plant identification)

```
Gemini identifies plant → scientific_name + telugu_name
   ↓
Resolve classical name(s): scientific → Sanskrit synonym table
   (e.g. Anogeissus latifolia → "dhava")
   ↓
Vector search charaka_sutras for that classical name
   ↓
Return matched sutras with citations → populate FIELD 1 (Classical)
   ↓
If terrain = jangala AND plant in Ka1#8 list →
   surface the "you are in the terrain Charaka describes" insight
```

### 5.3 — The Sanskrit synonym table (the critical bridge)

The hardest and most valuable piece. Maps botanical names ↔ classical names ↔ Telugu folk names. Seed it from the Jangala list, expand as you document. This table is itself a community-buildable artifact.

```
charaka_synonyms
├── botanical:    "Anogeissus latifolia"
├── classical:    ["dhava"]
├── telugu_folk:  ["చిట్టగి / Chittagi"]
├── jangala_listed: true
├── sutra_refs:   ["Ka1#8"]
└── confidence:   "high" | "probable" | "community-proposed"
```

### 5.4 — In the app: the "Ancient" tab

On a species knowledge card, the **ANCIENT** tab (unlocked at 100-day streak per the Sage progression) renders FIELD 1:

- Classical name in Devanagari + transliteration
- The matched sutra(s), exact text, with `Su1#114` style citation
- Terrain concordance ("named as Jangala flora — Ka1#8")
- A note when the plant is *absent* from classical texts ("Not found in Charaka — a candidate for new documentation"). Absence is data too.

---

## PART 6 — THE INITIATION (what this means for the journey)

This artifact is the formal start. Here's the sequence it kicks off:

1. **Now** — Charaka Codex becomes the schema. Every plant you've already photographed gets a `charaka` object. *Anogeissus* → dhava → Jangala → Ka1#8. *Euphorbia* → snuhi → Su1#114. *Ficus* → asvattha/vata → Ka1#8.

2. **Sunday's ridge climb** — you'll be documenting the *purest Jangala zone* — the exposed, windswept, low-water rock that Charaka calls the healthiest terrain. Photograph what survives up there. Those are the true Jangala specialists.

3. **Month 1–3** — build the Sanskrit synonym table from the Jangala list. ~15 plants. Each confirmed link is a permanent piece of infrastructure.

4. **Month 4+** — open it to community. A botany student in Tirupati, a Yanadi elder near Srikalahasti — each adds FIELD 2 folk knowledge against the FIELD 1 classical spine.

5. **The long arc** — Hariharakhona #001 proves the model. Then Seshachalam, Nallamala, the whole Eastern Ghats. Every region instance inherits the Charaka Codex. The classical texts become the connective tissue across all of Rayalaseema.

---

## APPENDIX — KEY SUTRAS TO EMBED FIRST

Priority chunks for the pgvector seed, with their citations:

| Topic | Citation | Why it matters |
|---|---|---|
| The knower-of-plants charter | Su1#120-123 | The philosophical foundation — print it on the splash screen |
| The 3 lands | Ka1#8 | Terrain classification — the Hariharakhona = Jangala link |
| Healthiest/unhealthiest regions | Vi3#46-48 | Jangala = most healthy |
| The 5 elements | Su1#56 | Base of the pharmacology schema |
| The 6 tastes + actions | Su26#9, Su26#43 | The rasa axis of every plant card |
| Taste variation by season/place | Su26#40 | Why *place and time* matter — same plant differs |
| Latex-bearing plants | Su1#114-115 | Safety gate — snuhi/arka/asmantaka |
| Bark-medicine trees | Su1#116-119 | Useful-part documentation model |
| "No substance is not a drug" | Su26#12 | The completeness principle |
| 3 not to overuse | Vi1#15-18 | Pippali, alkali, salt — the caution principle |

---

*Charaka Codex · PlantSage.earth · Antharmaya Labs*
*Initiation artifact for the documentation of Rayalaseema and the Eastern Ghats*
*Hariharakhona #001 · 13.7123°N 79.7137°E · Jangala terrain*
