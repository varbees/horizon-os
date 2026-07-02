# infra/ — the cloud-GPU workflow

Your laptop (16GB, no NVIDIA GPU) is the **cockpit**. Real training runs happen on a
GPU you spin up in the cloud, on demand, and **tear down when done** so it costs
nothing while idle. You don't need this for rung 0 (free Colab is enough). It comes
online at **rung 1**.

The pattern, every time:

```
spin up GPU box  →  sync this repo up  →  run  →  pull artifacts back  →  tear down
```

## Why SkyPilot

[SkyPilot](https://skypilot.readthedocs.io) (open source, from Berkeley) is built for
exactly this: "run this workload on a cheap cloud GPU, manage spot instances, stop it
when idle, get my files back." It handles provisioning, file sync, and — critically
for credit-funded work — **spot instances** (much cheaper) and **auto-stop**. It uses
your existing AWS credentials and credits.

> **Audit-before-trust:** SkyPilot is reputable and widely used, but it's still a
> third-party tool that will hold cloud permissions. Pin the version, skim its
> release notes before upgrading, and give it an IAM role scoped to only what it
> needs (EC2 + the one S3 bucket below) — not your full AWS account.

## One-time setup

```bash
# AWS credentials (use an IAM user/role scoped to EC2 + your artifacts bucket)
aws configure

# SkyPilot
uv pip install "skypilot[aws]"
sky check                      # confirms AWS is wired up
```

## The workflow

A run is described by a SkyPilot task file. See [`skypilot/foundations.yaml`](./skypilot/foundations.yaml)
as the template (it's deliberately small — a single modest GPU).

```bash
# launch: provisions a GPU (spot by default), syncs the repo, runs the task
sky launch -c lab infra/skypilot/foundations.yaml

# stream logs / reconnect any time
sky logs lab

# pull artifacts back to local (checkpoints, plots, logs)
#   the task writes outputs to ~/sky_workdir/out on the box; sync them down:
sky storage ... / scp / aws s3 cp   # see the task file's notes

# IMPORTANT — stop or tear down so it stops costing money:
sky stop lab                   # stop (keeps disk; quick to restart)
sky down lab                   # destroy (no further cost)
```

## Cost-safety rules (credit-funded discipline)

- **Spot by default.** The task file requests spot; expect occasional preemption,
  which is fine for non-critical training. Use on-demand only when you need a run to
  not be interrupted.
- **Auto-stop.** The task sets an idle auto-stop so a forgotten box doesn't bleed
  credits overnight. Verify with `sky status`.
- **Tear down when truly done** (`sky down`), not just stop, once you've pulled
  artifacts.
- **Start small.** A single `g5.xlarge` / `g6.xlarge` (one 24GB GPU) covers rungs
  1–2 learning. Multi-GPU `p4d`/`p5` is expensive — only when rung 2 genuinely needs
  it, and torn down immediately after.
- **Check `sky status` before bed.** One command; saves real money.

## GPU vs TPU note

AWS = NVIDIA GPUs. JAX runs great on GPU (`jax[cuda12]`). Where the scaling book
(rung 2) discusses TPU specifics, we translate to GPU/NCCL terms in that rung's guide.
If you want to *see* the TPU-native version, free Colab offers TPU runtimes — no AWS
needed for that.
