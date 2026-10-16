---
'@mysten/bcs': patch
'@mysten/utils': patch
'@mysten/sui': patch
---

Speed up BCS parsing and serialization: faster ULEB, integer and byte reads and writes, enum and option encoding, string decoding, and a single input conversion per write for transformed types. Base58, base64 and hex helpers in `@mysten/utils` are faster and no longer depend on `@scure/base`. Sui address and object digest encoding is faster.

Behaviour changes:

- `BcsReader.readBytes` and `readULEB` throw instead of reading past the end of a view into the rest of its buffer.
- `bcs.option(T)` returns `null`/`undefined` when `T` reads as `null`/`undefined` (for example a nested option's inner `None`), instead of `true`.
- `bcs.Address.serializedSize` and `bcs.ObjectDigest.serializedSize` throw on invalid input instead of returning a size.
