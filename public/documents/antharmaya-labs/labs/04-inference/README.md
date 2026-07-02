# Rung 4 — Inference & Serving

**Status:** planned.

**You'll understand:** that serving is a *different* problem from training —
dominated by **latency** and a different memory profile. The core ideas: the
**KV-cache** (why generation reuses past computation), **quantization** (smaller
number formats to fit and go faster), and the **latency vs. throughput** tradeoff
(batching helps throughput, hurts per-request latency).

**You'll run:** a small trained model served with a real KV-cache, measuring tokens/
sec and latency, exploring the tradeoff.

**The payoff:** you now understand the full lifecycle — a model from random numbers,
through training, scaling, kernel optimization, to actually answering a request. That
is the frontier-systems arc, walked end to end, under Antharmaya Labs.

*The final rung of the path.*
