# Antharmaya Labs

> A solo research-and-product studio, building in the open.
> This repo is the lab: we reconstruct the modern ML-systems stack from first
> principles, and every step ships as working code **plus** a guide.

Antharmaya Labs is a *lab* — the name was always a promise. This repository is
where that promise becomes real. It is, at once:

- **a curriculum** — a path from "I understand arrays" to "I can reason about how
  frontier models train and run, and optimize them at the kernel level";
- **the studio's flagship open-source artifact** — proof of capability, not a pitch;
- **a body of public technical writing** — beautiful, honest guides, each one a
  thing someone else could learn from;
- **a working machine** — code that actually runs on real accelerators in the cloud.

The wager is simple: **mathematical and systems maturity is the durable moat.**
Frameworks change; the understanding of *how computation, memory, and parallelism
shape what is possible* does not. We build that understanding by building.

---

## How this lab works

You don't need to hand-write the code. You need to understand the machine well
enough to **direct** it and to know, immediately, when it is wrong. So the loop is:

1. **Read the guide** for a rung. It teaches the concepts and the mental model —
   concept-first, beginner-honest, no hand-waving.
2. **Run the prompts** through your coding agent (Codex / Claude Code) to generate
   the rung's code. Then *read every line* and make sure you can explain it. The
   skill lives in the reading.
3. **Run it** — toy scale on free Colab, real scale on a cloud GPU (see `infra/`).
4. **Benchmark and write it up.** The writeup becomes the published guide on
   antharmaya.com. Building in public *is* the proof of skill.

---

## The path (start to finish)

Each rung = a guide (`GUIDE.md`) + agent prompts (`PROMPTS.md`) + code (agent-generated) + benchmarks.

| Rung | Folder | What you'll understand | What you'll run |
|---|---|---|---|
| **0 — Foundations** | `labs/00-foundations` | What "learning" is; JAX's trace→compile→run model; the four transformations (`grad`, `jit`, `vmap`, sharding); autodiff is not magic | A from-scratch micro-autodiff + a tiny train loop, on free Colab |
| **1 — Transformer** | `labs/01-transformer` | Attention, the MLP block, embeddings, the full decoder; what a language model actually *is* | A from-scratch transformer training a tiny LM, on one cloud GPU |
| **2 — Scaling** | `labs/02-scaling` | Rooflines & arithmetic intensity; data / tensor / FSDP parallelism; where communication becomes the bottleneck | The same model sharded across multiple GPUs |
| **3 — Kernels** | `labs/03-kernels` | Going *below* the compiler: Pallas/Triton, the innermost loop, profile-and-optimize | A hand-written, profiled kernel that beats the naive op |
| **4 — Inference** | `labs/04-inference` | Serving: KV-cache, quantization, the latency/throughput tradeoff | A small model served with a real KV-cache |

> **Why this order:** rung 2 (scaling) is just rung 0's four transformations
> *across devices*; rung 3 (kernels) is what you reach for when the compiler
> isn't enough. The foundation is the leverage — everything later is a variation
> on it. This is the same arc the frontier labs' own materials follow (see
> *References*), translated into a path one person can actually walk.

---

## Stack

- **Core:** [JAX](https://docs.jax.dev) + [Flax NNX](https://flax.readthedocs.io) (neural nets) + [Optax](https://optax.readthedocs.io) (optimizers).
- **Python env:** [`uv`](https://docs.astral.sh/uv/) (fast, reproducible).
- **Compute:**
  - *Free / iteration:* Google Colab (free GPU **and** TPU) and Kaggle.
  - *Real runs:* a cloud GPU spun up on demand via [SkyPilot](https://skypilot.readthedocs.io) on AWS, then torn down. See [`infra/`](./infra). **Cost-safe by default** (spot + auto-stop).
- **Guide site:** Next.js 15 + MDX, deployed to **Cloudflare Pages** (free; on infra we already own). Lives in [`site/`](./site) — *built in a later step, once we have ≥2 rungs of content to design around.*
- **CI:** GitHub Actions runs each rung's code so the guides never rot.

> **Honest hardware note.** AWS gives us **NVIDIA GPUs, not TPUs.** JAX runs
> excellently on GPU, and every *concept* in the path transfers. But the scaling
> book is TPU-centric: where it talks about TPU `ICI`, `HBM` ratios, or `v5e`/`v5p`,
> we translate to the GPU world (NVLink/PCIe, NCCL collectives). Those spots are
> flagged in the rung-2 guide. Free Colab TPUs are available if you want to see the
> TPU-native version too.

---

## Quickstart

```bash
# 1. clone, then create the env
uv sync                      # installs jax (CPU), flax, optax, dev tools

# 2. for a GPU box (cloud), install the CUDA build instead:
#    uv pip install -U "jax[cuda12]"

# 3. start at rung 0 — open the guide, then the prompts
$EDITOR labs/00-foundations/GUIDE.md
$EDITOR labs/00-foundations/PROMPTS.md
```

Rung 0 needs nothing but free Colab. Real GPUs come online at rung 1.

---

## Repo layout

```
antharmaya-labs/
├─ README.md                 # this file — the thesis + the path
├─ pyproject.toml            # uv: jax, flax, optax
├─ labs/
│  ├─ 00-foundations/        # GUIDE.md + PROMPTS.md  (built)
│  ├─ 01-transformer/        # learning objectives     (next)
│  ├─ 02-scaling/
│  ├─ 03-kernels/
│  └─ 04-inference/
├─ infra/                    # cloud-GPU workflow (SkyPilot, cost-safe)
├─ site/                     # antharmaya.com guide site (later step)
└─ .github/workflows/        # CI: run the code, build the site
```

---

## References (the giants we're standing on)

- **How to think in JAX** — the mental model. <https://docs.jax.dev/en/latest/notebooks/thinking_in_jax.html>
- **Autodidax: JAX from scratch** — autodiff demystified. <https://docs.jax.dev/en/latest/autodidax.html>
- **How to Scale Your Model** — Google DeepMind's scaling textbook (the road ahead). <https://jax-ml.github.io/scaling-book/>
- **How to Land a Frontier Lab Job** — V. Feinberg, on what actually matters: intent, mathematical maturity, grit, and kernel-level performance work as the most direct on-ramp. <https://vladfeinberg.com/2026/05/10/how-to-land-a-job-at-a-frontier-lab.html>

---

*Antharmaya Labs — built in the open, one rung at a time.*
