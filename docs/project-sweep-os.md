# Project Sweep OS

Horizon should know the real state of local work before it generates new tasks.
The sweep layer is local-first and non-destructive.

## What It Scans

- `/home/driftr/Desktop/bolting`
- `/home/driftr/Desktop/Documents`
- `/home/driftr/Documents`
- `/home/driftr/Downloads`
- the current Horizon OS repo

It excludes obvious external/tooling clones and generated folders such as
OpenClaw, Claude Code, `node_modules`, build output, and cache folders.

## What It Writes

- SQLite:
  - `project_sweep_runs`
  - `project_sweep_projects`
- Markdown:
  - `.horizon/project-sweep.md`
  - `/home/driftr/Desktop/bolting/_horizon_project_index/PROJECTS.md`
- Symlink folders:
  - `active-money`
  - `strategic-proof`
  - `resurrect-candidates`
  - `archive`
  - `docs-and-ideas`
  - `unknown-review`

Repos and files stay in their original locations. The index is only a clean
navigation layer.

## Commands

```bash
npm run projects:sweep
npm run projects:sweep:watch
```

`projects:sweep:watch` runs once and then repeats every hour by default. Set
`HORIZON_PROJECT_SWEEP_INTERVAL_MINUTES` in `.env` to change the interval.

## Revenue Rule

The sweep exists to answer:

1. What changed?
2. Which repos are dirty?
3. Does the changed work support PhotoSelect revenue, varbees fast-cash, or reusable proof?
4. What deployable action should Horizon create next?
