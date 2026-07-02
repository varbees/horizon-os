# Rung 1 — A Transformer from Scratch

**Status:** next to build.

**You'll understand:** what a language model actually *is* — token embeddings,
self-attention (queries/keys/values, why attention is "soft lookup"), the MLP block,
residual connections and layer norm, and how a stack of these predicts the next
token. The point is to remove all magic from the word "transformer."

**You'll run:** a small decoder-only transformer, built (via agent prompts) in
JAX/Flax NNX, trained on a tiny text corpus (e.g. character-level Shakespeare) on a
single cloud GPU (`infra/`). You'll watch it go from gibberish to almost-English.

**Deliverable:** working code + a GUIDE.md that explains attention from first
principles with diagrams + a benchmark + a published writeup for antharmaya.com.

*Built after you can explain every line of rung 0.*
