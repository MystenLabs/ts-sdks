---
'@mysten/wallet-sdk': minor
---

Add `restrictedMoveCalls(options)`, an analyzer that finds MoveCalls into restricted packages, modules or functions and reports each with a `'block'` or `'warn'` level. It flags `0x2::address_alias` calls as `'block'` by default, and adds no issues, so the caller decides whether to warn or block.
