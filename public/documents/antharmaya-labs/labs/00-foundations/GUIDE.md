# Rung 0 — Foundations

### How to think in JAX, and what "learning" even means

You're a strong engineer who is new to ML. Good — that's the ideal starting point,
because most of ML systems is *systems*, and you already think in those terms. This
rung gives you the mental model the whole rest of the path rests on. No code to
write by hand here; the goal is that by the end you could explain, to another
engineer, exactly what happens when a model "learns" and what JAX is doing under
the hood. The code you'll generate with your agent (`PROMPTS.md`) exists to make
these ideas concrete, not to be memorized.

---

## 1. The substrate: arrays, and why accelerators exist

Almost all of ML is arithmetic on **arrays** (also called tensors): grids of
numbers with a **shape** (e.g. `[512, 768]`) and a **dtype** (e.g. `float32`).
A sentence becomes an array. An image becomes an array. A model's knowledge is
stored as arrays. "Doing ML" is overwhelmingly: *multiply these big arrays, add
these, apply a simple nonlinear function, repeat.*

The single most important operation is **matrix multiplication** — combine a
`[batch, d_in]` array of inputs with a `[d_in, d_out]` array of weights to get a
`[batch, d_out]` array of outputs. A transformer is, to a first approximation, a
tall stack of matrix multiplications with a little glue between them.

Why GPUs and TPUs exist: a matmul is *the same multiply-and-add applied to millions
of number pairs, all independent of each other.* A CPU does a handful of things very
fast in sequence. An accelerator does an enormous number of identical arithmetic
operations **at once**. If you've reasoned about SIMD or data-parallelism, this is
that idea taken to its extreme — thousands of arithmetic units chewing through one
giant array operation in lockstep. That's the whole reason the hardware looks the
way it does, and it's why **how data moves through memory** ends up mattering as
much as how much arithmetic you do (the theme of rung 2).

---

## 2. What "learning" is, concretely

Strip away the mystique and a model is just a function:

```
prediction = f(params, input)
```

`params` are arrays of numbers — at first, random. `f` is a fixed sequence of array
operations (the architecture). Learning is the process of finding *good* numbers for
`params`. Here is the entire loop, honestly, with nothing hidden:

1. **Forward pass.** Run `f(params, input)` to get a prediction.
2. **Loss.** Compute a single number — the **loss** — measuring how wrong the
   prediction is (e.g. "how far is the predicted next word from the real one").
3. **Gradient.** Compute the **gradient of the loss with respect to every parameter**:
   for each number in `params`, which direction (up or down) and how strongly does
   nudging it change the loss? The gradient is just the collection of all those
   partial derivatives.
4. **Update.** Nudge every parameter a small step in the direction that *reduces*
   loss. The step size is the **learning rate**.
5. **Repeat** millions of times over lots of data.

That's it. That's **gradient descent**, and it is ~all of how every model you've
heard of is trained. GPT, Gemini, Claude — same loop, unfathomably scaled.

So where's the difficulty? Two places, and they map exactly onto this path:

- **Computing the gradient efficiently** for a function with billions of parameters.
  The mechanism is **automatic differentiation (autodiff)**. We demystify it below
  and you'll build a tiny version (rung 0).
- **Doing all of this fast, at scale**, when the arrays are too big for one chip.
  That's **systems** — parallelism, memory, kernels (rungs 2–4).

Hold onto this: *everything later is in service of running this one loop bigger and
faster.*

---

## 3. JAX's mental model: trace → compile → run

JAX *looks* like NumPy (the standard Python array library). `jax.numpy` mirrors its
API, so `jnp.dot(a, b)` multiplies arrays just as you'd expect. But JAX is built for
two things NumPy isn't: **accelerators** and **transformation**. Understanding the
difference is the key that unlocks everything.

Here's what actually happens when you run a JAX function on an accelerator. Think of
it as a **just-in-time compiler for array programs** — because that's exactly what
it is:

1. **Trace.** JAX runs your Python function *symbolically* once, recording every
   array operation you perform (not the numbers — the *operations* and their
   shapes). The recording is called a **jaxpr** — a small, clean intermediate
   representation of your computation.
2. **Compile.** That jaxpr is handed to **XLA**, a compiler that optimizes it
   (fusing operations, planning memory) and emits highly efficient machine code for
   your specific accelerator.
3. **Run.** The compiled program executes on the GPU/TPU, fast.

If you've written or even just used a compiler, this will feel familiar and powerful.
And it explains JAX's "rules," which otherwise look arbitrary:

- **Arrays are immutable.** You never write `x[0] = 5`. Instead `x = x.at[0].set(5)`
  returns a *new* array. (Why: pure, side-effect-free functions are what make
  tracing and transformation safe and composable.)
- **Shapes must be static at compile time.** The compiler needs to know array sizes
  to generate code. Your *values* can change between runs; your *shapes* generally
  can't, or JAX recompiles.
- **No hidden side effects inside compiled functions.** Printing, mutating globals,
  reading the clock — these don't belong inside the part you `jit`. The function
  should be a pure mapping from inputs to outputs.

These aren't restrictions to fight. They're the contract that lets a compiler turn
your readable Python into something that saturates a GPU.

---

## 4. The four transformations (this is the whole game)

Because your functions are pure, JAX can *transform* them — take a function and
return a new, more powerful function. There are four you need, and almost everything
in modern ML systems is these four, composed, at scale.

**`grad(f)` — automatic differentiation.**
Give `grad` your loss function; it returns a new function that computes the
*gradient* — the derivatives from step 3 above — automatically, for arbitrarily
complex `f`. This is the engine of all learning. Crucially, **it is not magic and
not numerical guessing.** It's the chain rule from calculus, applied mechanically by
walking the recorded operations backward. You will build a tiny version from scratch
in this rung specifically so that `grad` never feels like a black box again. (When a
number is wrong in training, knowing what `grad` actually does is how you debug it.)

**`jit(f)` — compile it.**
`jit` triggers the trace→compile→run pipeline above, caching the compiled program.
The first call is slower (it compiles); every call after is fast. This is where the
performance comes from. The static-shape and no-side-effect rules apply *here*.

**`vmap(f)` — automatic batching.**
Write your function for **one** example — clean, simple, no batch dimension to track.
`vmap` returns a version that runs it across a whole **batch** in parallel, without
you rewriting anything or hand-writing loops. This keeps model code readable and lets
the compiler parallelize properly. It's one of JAX's quiet superpowers.

**`pmap` / sharding — across devices.**
The same idea as `vmap`, but spread across **multiple chips**. This is the seed of
rung 2. When a model is too big for one GPU, you *shard* its arrays across several
and JAX (with XLA) coordinates the computation and the communication between them.
Every headline about training a model on thousands of chips is, underneath, this.

> **The insight to carry forward:** a frontier training system is not a different
> kind of thing from what you'll build in rung 0. It is `grad` + `jit` + `vmap` +
> sharding, composed, running the gradient-descent loop from §2, scaled across an
> enormous number of accelerators — with a great deal of careful engineering (rungs
> 2–4) to keep the chips fed and the communication from becoming the bottleneck.

---

## 5. What you'll build this rung (with your agent)

Open `PROMPTS.md` and run these through Codex 5.5 high. Read the generated code
closely; the comments are required, because the point is comprehension.

- **(a) A from-scratch micro-autodiff** — in plain Python, no JAX. You'll implement
  the forward pass and a backward (reverse-mode) pass on a tiny computation, and see
  the chain rule produce the same gradients JAX would. *Goal: `grad` is never magic
  again.*
- **(b) A tiny model + training loop in real JAX** — fit a simple function (or
  classify some toy 2D points). Random `params`, a loss, a gradient, an update, in a
  loop. *Goal: you've watched the §2 loop actually drive loss down.*
- **(c) Add `jit` and `vmap`, and benchmark** — wrap the step in `jit`, batch with
  `vmap`, and measure the speedup. *Goal: the trace→compile→run model becomes
  something you've felt, not just read.*

---

## 6. Running it (and an honest note)

Your 16GB laptop is the cockpit, not the engine. For rung 0 you don't need the
engine at all — **free Google Colab** (which offers both GPU and TPU runtimes) is
more than enough for these toy problems. Paste the agent-generated code into a Colab
notebook, or run the repo's scripts there.

Real cloud GPUs (AWS, via SkyPilot) come online at **rung 1**, when models get big
enough to need them. See [`../../infra/`](../../infra). When that time comes, the
workflow is: spin up a GPU box, sync this repo, run, pull the outputs (checkpoints,
logs, plots) back to local — then **tear the box down** so it costs nothing idle.

And the honest expectation: *this is the rung where patience pays.* Your instinct is
to ship fast; here, the leverage is in going slow enough that the four transformations
and the trace→compile→run model become second nature. Everything above this rung is a
variation on what you learn here. Rush the foundation and rungs 2–4 will feel like
magic you can't debug. Build it solidly and they'll feel like consequences.

---

## 7. What this unlocks

When trace→compile→run is intuitive and the four transformations are reflexive:

- **Rung 2 (scaling)** stops being intimidating — it's "these same transformations,
  across many devices, while watching where the time actually goes."
- **Rung 3 (kernels)** becomes legible — it's "drop below XLA and hand-write the
  inner loop when the compiler leaves performance on the table." This is the
  skill Feinberg's post calls the most direct on-ramp into a frontier lab.
- You become someone who can **reason about how real models train and run** — and
  build ML-systems-grade work solo, directing agents, under Antharmaya Labs.

> Read alongside this rung: **Thinking in JAX** and **Autodidax** (links in the root
> README). When you're ready to look down the road, skim chapter 1 of **How to Scale
> Your Model** — it'll make far more sense now than it would have an hour ago.

**Next:** generate and run the rung-0 code (`PROMPTS.md`), then we build rung 1 —
a transformer from scratch.
