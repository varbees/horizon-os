# Rung 0 — Build Prompts (Codex 5.5 high / Claude Code)

These are self-contained specs. Paste one at a time into your agent. After each,
**read the generated code and make sure you can explain every line** — that's the
actual exercise. If a line is unclear, ask the agent to explain it, not to rewrite it.

Working directory for generated code: `labs/00-foundations/`.

---

## Prompt 1 — Micro-autodiff from scratch (no JAX)

```
Write a single, heavily-commented Python file `micro_autodiff.py` that implements
reverse-mode automatic differentiation from scratch, with NO external libraries
(pure Python, no numpy, no jax). The point is pedagogical: to show that gradients
are just the chain rule applied mechanically.

Requirements:
- A `Value` class wrapping a single scalar float, which records the operation that
  produced it and its parent Values (a small computation graph).
- Support +, *, and one nonlinearity (tanh). Implement __add__, __mul__, and tanh().
- A `.backward()` method that does reverse-mode autodiff: topologically sorts the
  graph, then propagates gradients from output to inputs via the chain rule,
  accumulating each Value's `.grad`.
- At the bottom, a `if __name__ == "__main__":` block that:
  - builds a tiny expression, e.g. L = tanh(a*b + c) with concrete numbers,
  - calls L.backward(),
  - prints a.grad, b.grad, c.grad,
  - and verifies each against a numerical finite-difference estimate
    (f(x+h) - f(x-h)) / (2h), asserting they match to a small tolerance.

Comment every method explaining WHY, in terms of the chain rule. Keep it under ~120
lines. Optimize for clarity over generality.
```

**What to take from it:** the `.backward()` walk *is* what `jax.grad` does, just for
scalars instead of arrays. Once you see the chain rule accumulate gradients here,
`grad` is permanently demystified.

---

## Prompt 2 — A tiny training loop in real JAX

```
Write a heavily-commented file `tiny_train.py` using JAX (jax, jax.numpy) and a
hand-rolled SGD update (do NOT use optax yet — I want to see the update explicitly).

Task: fit a noisy 1-D function. Generate synthetic data y = sin(2*pi*x) + small
gaussian noise, for x in [0,1].

Model: a small MLP (e.g. 1 -> 32 -> 32 -> 1) with tanh activations. Represent params
as a pytree (a list/dict of jnp arrays). Initialize with small random values using
jax.random (show the explicit PRNGKey handling — explain why JAX makes randomness
explicit).

Implement, each as its own clearly-commented function:
- `forward(params, x)` -> prediction
- `loss_fn(params, x, y)` -> scalar mean-squared-error
- the gradient via `jax.grad(loss_fn)`
- an `sgd_update(params, grads, lr)` that returns new params (use jax.tree.map to
  walk the pytree; explain what tree.map is doing)
- a training loop for N steps that prints the loss every so often and shows it
  decreasing

At the end, print the final loss and (optionally) save a matplotlib plot of the data
vs. the model's fitted curve to `tiny_train_fit.png`.

Add a top-of-file comment mapping each part of the code to the 5-step learning loop
(forward / loss / gradient / update / repeat). Keep it readable; correctness and
clarity over cleverness.
```

**What to take from it:** you are watching §2's loop actually run. Find the five
steps in the code. Watch the loss fall. That falling number is "learning."

---

## Prompt 3 — Add jit + vmap, and benchmark

```
Create `tiny_train_fast.py` by extending the previous tiny_train.py. Two changes,
each clearly commented:

1. jit: wrap the single training step (loss + grad + update) in a function
   `step(params, x, y, lr)` and apply `jax.jit` to it. Explain in comments that the
   first call compiles (slow) and subsequent calls are fast, and why static shapes
   matter here.

2. vmap: refactor `forward` so it is written for a SINGLE example (no batch
   dimension), then use `jax.vmap` to apply it across the batch. Explain what vmap is
   doing and why this keeps the model code clean.

Then benchmark honestly:
- time the un-jitted step vs the jitted step over many iterations (exclude the first,
  compilation call from the jitted timing, and say why),
- print both timings and the speedup factor.

Add a short comment block at the bottom summarizing what trace -> compile -> run
means in light of what you just measured. Keep it correct and well-commented.
```

**What to take from it:** the speedup is the compiler earning its keep. The exclusion
of the first (compilation) call is the trace→compile→run model made measurable.

---

### After rung 0

You should now be able to explain, unprompted: what an array is and why accelerators
exist; the five-step learning loop; what `grad`, `jit`, and `vmap` each do; and what
JAX does between your Python and the GPU. If any of those is shaky, revisit the guide
section — don't move on. When they're solid, we build **rung 1: a transformer from
scratch.**
