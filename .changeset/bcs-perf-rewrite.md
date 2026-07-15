---
'@mysten/bcs': minor
'@mysten/sui': patch
---

Performance rewrite of BCS encoder/decoder for 5-20x speedup.

Many performance ideas in this rewrite were inspired by
[@unconfirmedlabs/bcs](https://github.com/unconfirmedlabs/bcs) by BL.

Key changes:
- Closure-based encoder/decoder replacing DataView-based BcsReader/BcsWriter
- Manual little-endian byte reads, bulk ops for primitive vectors
- ASCII fast path for string encode/decode
- Unrolled struct/enum/tuple codecs for 1-8 fields
- Shared buffer reuse for small serializations
- New `toBytes()`, `toHex()`, `toBase64()`, `toBase58()` convenience methods on BcsType
- `BcsType.read()` and `BcsType.write()` are deprecated in favor of `parse()`/`toBytes()`/`serialize()`
