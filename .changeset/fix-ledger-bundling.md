---
'@mysten/ledgerjs-hw-app-sui': minor
---

Switch from bundled ESM-only build to dual ESM/CJS unbundled build. This fixes a runtime error (`createRequire is not a function`) in React Native and browser environments caused by Node.js built-ins being inlined into the bundle via transitive dependencies (axios, semver, etc.).
