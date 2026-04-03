---
'@mysten/sui': minor
---

Add `formatAmount`, `parseAmount`, `formatSui`, and `parseSui` utility functions for converting between human-readable decimal strings and smallest-unit bigint representations. `formatAmount`/`parseAmount` accept a `decimals` parameter for any coin type, while `formatSui`/`parseSui` are convenience wrappers using SUI's 9 decimal places. Uses pure bigint arithmetic — no floating point.
