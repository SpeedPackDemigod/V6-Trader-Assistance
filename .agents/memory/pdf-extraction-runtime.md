---
name: PDF extraction runtime
description: Runtime constraint for server-side PDF text extraction in the API artifact.
---

Keep `pdf-parse` external to the API esbuild bundle. Its PDF.js dependency loads the optional Node canvas package dynamically; bundling moves that lookup away from the package dependency tree and can crash startup with a missing `DOMMatrix`.

**Why:** The library works when imported directly by the API package, but the bundled artifact failed before serving requests because the optional canvas dependency could not be resolved.

**How to apply:** When changing server-side PDF parsing or the API build, preserve the package boundary and verify a clean API workflow restart.
