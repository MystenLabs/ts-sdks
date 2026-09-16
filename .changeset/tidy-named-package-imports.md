---
'@mysten/sui': patch
---

Break the circular dependency between struct-tag and named-package utilities to prevent initialization errors in Next.js Turbopack production builds.
