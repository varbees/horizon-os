# Public Documents

Files in this directory are served by Vite at the site root and copied into
`dist` during builds. Keep only public-safe artifacts here.

Private identity, legal, banking, credential, certificate, or signed documents
belong under the ignored local archive:

```text
.horizon/private-documents/
```

That archive can still be indexed by local Horizon tooling later, but it must
not be exposed through the frontend static asset path.
