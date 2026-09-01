---
'@mysten/sui': minor
'@mysten-incubation/sponsor': patch
---

Add support for the `Validity` transaction expiration, which carries everything in `ValidDuring` plus an optional `allowed_proposers` set restricting which validators may propose the transaction in consensus. The BCS schema, transaction data model, and gRPC conversions understand the new variant, so transactions resolved or simulated by a server that populates allowed proposers round-trip correctly.
