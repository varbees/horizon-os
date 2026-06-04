# PlantSage Progress Ledger

Last updated: 2026-06-02

## Command-Center Role

PlantSage is strategic field-product proof inside Horizon OS, not the current
money lane. It should stay bounded to Stage 2 consistency: app/backend media
payloads, MinIO/R2 ingest proof, unified capture, safe ledger cards, and the
first Hariharakhona Place Pack. It becomes active only if a buyer, paid path, or
clear educational/content monetization signal appears.

The core product is now clear:

```text
place -> capture -> quick ID -> stored media -> research card -> atlas -> map progress
```

## Repos

| Repo | Path | Role |
| --- | --- | --- |
| PlantSage App | `/home/driftr/Desktop/bolting/03-strategic/plantsage` | Flutter mobile product, capture UX, map, atlas, card reveal, profile, alpha config |
| PlantSage Backend | `/home/driftr/Desktop/bolting/03-strategic/ff-planter` | FastAPI `/identify`, Gemini vision/research, SQLite, reports, storage, served artifacts |
| Raw field assets | `/home/driftr/Desktop/plantsagefieldwork_and_assets` | Source photos/videos/texts; not a Git storage location |

## Backend State

`ff-planter` is the canonical PlantSage backend. It has:

- FastAPI app with `/identify`, `/ready`, `/health`, `/api/dashboard`,
  `/observations`, `/research-jobs`, species reports, and served HTML artifacts.
- Gemini API vision identification and Gemini grounded research.
- Hash-addressed local upload ingestion under `data/uploads/`.
- SQLite observation/report schema with async-ready `research_jobs`,
  `source_documents`, `determinations`, `plant_claims`, `vernacular_names`,
  `region_occurrences`, and `review_events`.
- Local async worker path: `PLANTSAGE_ASYNC_RESEARCH=1` plus
  `python scripts/run_research_worker.py --once`.
- Local Postgres container on `127.0.0.1:55438` with vector extension prepared.
- MinIO local storage plus a Cloudflare R2-compatible `storage/client.py`.
- Vercel prototype path and Cloud Run deployment notes.
- Media payload in `/identify` response: `sha256`, MIME, byte size, local path,
  storage keys, public URL slot, source, and location precision.

Current backend command:

```bash
cd /home/driftr/Desktop/bolting/03-strategic/ff-planter
python -m uvicorn api.main:app --reload --port 8080
```

Mock mode for fast smoke:

```bash
PLANTSAGE_MOCK_IDENTIFY=1 PLANTSAGE_MOCK_RESEARCH=1 \
python -m uvicorn api.main:app --reload --port 8080
```

## App State

`plantsage` is the Flutter product surface for `plantsage.earth`. It has:

- Stage 1 app shell with map, atlas, identify, card reveal, and profile routes.
- Riverpod-backed capture controller and pipeline service.
- Gemini quick ID from image bytes, then backend `/identify` for full research.
- GPS/trail context attached before research.
- Low-confidence capture boundary before deep research.
- Seeded Hariharakhona Region #001 atlas records.
- Media fields in `SpeciesCard` and `LocalSpecies` so backend storage can flow
  into app cards.
- Storage rule: R2/MinIO credentials never go into Flutter; the app reads public
  media URLs or calls the backend.
- Untracked onboarding work currently exists under
  `lib/features/onboarding/splash_screen.dart`; treat it as in-progress until
  committed or deliberately discarded.

Current app checks:

```bash
cd /home/driftr/Desktop/bolting/03-strategic/plantsage
flutter analyze
flutter test
```

Run against local backend:

```bash
MAPS_API_KEY=your_android_maps_key \
flutter run \
  --dart-define=GEMINI_API_KEY=your_gemini_api_key_here \
  --dart-define=PLANTSAGE_API_BASE=http://10.0.2.2:8080
```

## 2026-05-29 Ridge Session

Field session: Hariharakhona / Sahasra Lingeshwara hill, Srikalahasti,
06:38-08:53 IST.

Captured:

- 50 JPG photos.
- 5 videos.
- Charaka Samhita PDF, Gabriel Van Loon edition, 621 pages.
- Full terrain transect: valley approach, cliff base, mid-slope, granite ridge
  summit.
- Pre-monsoon mist and active deciduous leaf flush.

Confirmed or strengthened:

- `Bauhinia vahlii`: upgraded from probable to confirmed through bilobed leaf
  close-up, stem/leaf context, and woody climber mass.
- `Euphorbia caducifolia`: confirmed with flowering cyathia and granite ridge
  ecology; safety class is toxic latex.
- `Wrightia tinctoria`: flowers and long seed pods documented together.
- Lichen community: orange Caloplaca-type plus dark crustose lichens on summit
  granite, useful as an air-quality/ecological indicator.
- Terrain/geology: valley-to-ridge zonation and Closepet gneiss/granite
  context.

Pending IDs:

- Glossy rounded shrub: candidates are `Carissa carandas` or
  `Ziziphus xylopyrus`; next session needs thorns, fruit, and leaf underside.
- Pinnate crevice plant: candidates include young Cassia/Senna, Dalbergia, or
  Tephrosia; next session needs flower, pod, and stem close-up.

Dry-run ingest was verified from the backend repo:

```bash
python scripts/ingest_field_session.py \
  --source /home/driftr/Desktop/plantsagefieldwork_and_assets \
  --session-id 2026-05-29-ridge \
  --trail-section "Granite ridge" \
  --bucket plantsage-plants \
  --texts-bucket plantsage-texts \
  --dry-run
```

Result: 50 images mapped to
`plantsage-plants/field/hariharakhona/2026/05/29/raw/...` and 1 text mapped to
`plantsage-texts/texts/classical/en/Charaka-Samhita-Acharya-Charaka.pdf`.

## Stage 2 Gate

Do these before expanding screens or community launch:

1. Media contract: keep `/identify` and Flutter on one payload shape.
2. Storage proof: MinIO upload first, then one Cloudflare R2-backed public media
   URL.
3. Capture contract: live camera and the tested controller must use one state
   machine.
4. Safe ledger card: source-separated sections for field evidence, ecology,
   classical citations, folk/local claims, modern phytochemistry, and safety.
5. Place Pack: make Hariharakhona Region #001 a first-class place model instead
   of scattered hardcoding.
6. Atlas/map precision: distinguish exact, approximate, missing, unresolved, and
   community-level records.

## Horizon OS Rule

PlantSage can build long-term Antharmaya depth, but it is not allowed to become
the escape hatch from sales work. Work it in named blocks, document the evidence,
and route reusable agent/storage/media lessons back into Horizon OS and the
service engine.
