# Infrastructure Inventory

Owned and planned infrastructure, captured so deployment targets and renewals never get lost. These
also appear as `domain` resources in the `/inbox` screen, tagged to their project.

## Domains (Cloudflare account: beesharsha@gmail.com)

| Domain | Project | Status | Use |
| --- | --- | --- | --- |
| antharmaya.com | antharmaya-labs | Owned / live | Foundry site (Next.js on Cloudflare Workers, OpenNext adapter). |
| photoselect.space | photoselect | Owned | Flagship product domain. Cloud Run API/worker + R2 media. Point production deploy here. |
| plantsage.earth | plantsage | Planned acquisition | Canonical PlantSage domain. Register + reserve www/app subdomains. |
| hskg.vercel.app | hskg | Done / parked | Completed Vercel proof link. Keep here until a domain is purchased for transfer or adjustments. |

All under one Cloudflare account, which keeps DNS, Workers, R2, and Pages billing consolidated.

## Capital note

Opening balance is INR 500 with no MRR; monthly income roughly covers survival plus subscriptions
(Claude and others). Domain renewals are a small recurring line that belongs in the Capital OS burn
figure once a monthly burn number is set. The operating priority remains the same: signed service
income first (see `docs/source-inputs/income_plan.md`).

## Next infra actions

- Point the production PhotoSelect deployment at `photoselect.space`.
- Register `plantsage.earth` and reserve `www` / `app` subdomains.
- Add active project proofs to `antharmaya.com`.
- Keep HSKG closed at `hskg.vercel.app` unless a domain purchase or requested adjustment creates a concrete task.
