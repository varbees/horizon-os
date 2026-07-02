# Rung 3 — Kernels

**Status:** planned.

**You'll understand:** how to go *below* the XLA compiler and hand-write the
innermost loop when the compiler leaves performance on the table — using **Pallas**
(JAX's kernel language) and/or **Triton**. You'll learn to read a profile, find the
hot op, and beat the naive version.

**Why it matters:** Feinberg's post names kernel-level performance work as the single
most direct on-ramp into a frontier lab — "every project needs people who can tune
the LLMs at the kernel level." This rung is the lab on-ramp made concrete.

**You'll run:** a hand-written, profiled kernel (e.g. a fused operation) that
measurably outperforms the naive op, with the before/after profile in the writeup.

*The deepest rung. Built once scaling is solid.*
