# site/ — antharmaya.com (the lab, online)

**Status:** built in a later step.

This will be the public face of the lab: a Next.js 15 + MDX site, deployed to
**Cloudflare Pages** (free; on infra we already own), rendering each rung's guide as
a beautiful, Distill-style technical article. The MDX source lives alongside the code
so guides and code stay in sync, and GitHub Actions builds the site on each push.

We build this once there are ≥2 rungs of guide content to design around — so the
design serves real material rather than placeholder text. The `frontend-design`
pass (typography, interactive diagrams, the lab's visual identity) happens then.
