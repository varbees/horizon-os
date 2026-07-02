# Rung 2 — Scaling

**Status:** planned.

**You'll understand:** the two budgets that govern everything — compute (FLOPs) and
memory bandwidth — and the **roofline** that tells you which one you're bound by;
**arithmetic intensity**; and the parallelism schemes for when a model won't fit on
one chip: **data**, **tensor**, and **FSDP** (fully-sharded data parallel). The key
lesson: at scale, *communication between devices* often becomes the bottleneck, and
the art is choosing a sharding that avoids it.

**You'll run:** the rung-1 transformer sharded across multiple GPUs, profiled, with
you reading the profile to see where time actually goes.

**GPU/TPU translation:** the DeepMind scaling book is TPU-centric; this guide
translates its concepts (ICI, HBM ratios, v5e/v5p) to the AWS GPU world (NVLink/PCIe,
NCCL collectives). Free Colab TPUs available if you want the TPU-native view.

*This is where rung 0's `vmap`/sharding intuition pays off.*
