---
'@mysten/sui': minor
'@mysten-incubation/sponsor': patch
---

Add BCS, transaction schema, and gRPC support for `Validity` transaction expirations and allowed proposers. Also synchronize recently added transaction and execution error variants.

The deprecated v1 JSON transaction format now represents `ValidDuring` and `Validity` expirations
instead of collapsing them to `{ None: true }`. Previously a `Transaction.serialize()` ->
`Transaction.from()` round trip silently discarded the expiration — and, for `Validity`, the set of
validators allowed to propose the transaction — so the rebuilt transaction signed materially
broader bytes. An expiration the v1 reader does not recognize is now an error rather than a silent
downgrade.
