---
'@mysten/deepbook-account': minor
---

Regenerate the Move bindings against the deployed `predict-testnet-8-21` account package (sourceCommit `1f79fe87`). The bindings were pinned to the older `predict-testnet-7-29` sources, where `Account` had no `referrer_receive_address`.

- `Account` gains its trailing `referrer_receive_address: Option<address>` field, and the `referrerReceiveAddress` getter is now generated.
- A round-trip test plus a byte-level assertion pin the `Account` / `AccountWrapper` field sets, order, and wire encoding, so a future regeneration that drops, reorders, or re-types a field fails in this package instead of in a consumer's decoded output.

**Breaking: this is a decode-layout change.** `AccountContract`'s API and behavior are unchanged — the builders, their argument slots, and `deriveAccountWrapperId` all emit byte-identical transactions, and `AccountConfig` still supplies the deployed ids. But the BCS structs now expect the 8-21 `Account`, so parsing an `Account` or `AccountWrapper` from the older 7-29 deployment will fail (`ULEB decode error: buffer overflow`) or, when the bytes are a view into a larger buffer as gRPC returns them, silently mis-decode `referrer_receive_address`. Consumers still reading 7-29 account objects should stay on `0.0.2`.
