---
'@mysten/deepbook-predict': patch
---

Source the on-chain account primitive from `@mysten/deepbook-v3/account` instead of `@mysten/deepbook-account`, which is superseded. No API or behavior change: the builders, derived ids and BCS layouts are the same code, moved.
