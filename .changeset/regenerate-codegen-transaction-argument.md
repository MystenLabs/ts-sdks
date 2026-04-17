---
'@mysten/walrus': patch
'@mysten/suins': patch
'@mysten/payment-kit': patch
'@mysten/kiosk': patch
'@mysten/deepbook-v3': patch
---

Regenerated Move call bindings. Parameters that can't accept a plain value (non-`key` struct or enum, `vector<KeyStruct>`, etc.) are now typed as `TransactionArgument`, forcing callers to pass a prior move-call result or `tx.makeMoveVec(...)`. Passing a bare string or array for these parameters was always broken at runtime.
