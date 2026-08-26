---
name: Vite React runtime cache
description: Preview-only React hook failures caused by mismatched Vite dependency cache identities.
---

When a Vite preview reports invalid hook calls while the installed React and React DOM versions match, inspect dependency optimizer cache identity before changing component hooks. A per-artifact cache and an entry-module cache-buster can be necessary when the preview proxy retains a shared optimized renderer.

**Why:** The browser can retain an older optimized React DOM chunk even after the source dependency graph changes, producing a misleading null dispatcher error that does not reproduce in tests or production builds.

**How to apply:** Keep React and React DOM in one explicit optimizer include set, use an artifact-local Vite cache directory, and bump the HTML module entry query after cache identity changes.