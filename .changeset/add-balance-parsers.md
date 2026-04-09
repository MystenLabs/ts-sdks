---
'@mysten/sui': minor
---

Add `parseToUnits` and `parseToMist` utilities for converting human-readable decimal strings into smallest-unit bigints. `parseToUnits(amount, decimals)` works for any coin; `parseToMist(amount)` is a SUI-specific convenience wrapper using 9 decimals. Uses pure bigint arithmetic — no floating point — so it preserves precision for values above `Number.MAX_SAFE_INTEGER`, where the common `BigInt(Math.round(parseFloat(s) * 1e9))` workaround silently corrupts amounts above ~9M SUI.
