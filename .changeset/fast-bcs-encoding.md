---
'@mysten/bcs': patch
'@mysten/utils': patch
'@mysten/sui': patch
---

Speed up BCS parsing and serialization: faster ULEB, integer and byte reads and writes, enum and option encoding, string decoding, and a single input conversion per write for transformed types. Base58, base64 and hex helpers in `@mysten/utils` are faster and no longer depend on `@scure/base`. Sui address and object digest encoding is faster. `BcsReader.readBytes` now throws instead of reading past the end of a view into the rest of its buffer, and nested `bcs.option` values decode an inner `None` as `null` instead of `true`.
