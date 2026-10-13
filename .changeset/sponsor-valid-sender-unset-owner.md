---
'@mysten-incubation/sponsor': patch
---

`validSender` no longer normalizes an empty string when the gas owner is unset, which would throw
with the stricter `normalizeSuiAddress` in `@mysten/sui` 3.0.
