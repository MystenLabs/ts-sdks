---
'@mysten/deepbook-account': patch
---

Regenerate the Move bindings against the deployed `predict-testnet-8-21` account package (sourceCommit `1f79fe87`). The bindings were pinned to the older `predict-testnet-7-29` sources, where `Account` had no `referrer_receive_address`.

- `Account` gains its trailing `referrer_receive_address: Option<address>` field, and the `referrerReceiveAddress` getter is now generated. Because BCS is positional, a struct missing a field silently mis-parses everything after it — harmless while the omission is the last field and callers read earlier ones, but it is corrected here rather than left latent.
- A round-trip test pins the `Account` / `AccountWrapper` field sets and order, so a future regeneration that drops or reorders a field fails in this package instead of in a consumer's decoded output.

No API or behavior change to `AccountContract`: the builders, their argument slots, and `deriveAccountWrapperId` are unchanged, and `AccountConfig` still supplies the deployed ids, so consumers targeting either deployment keep working.
