---
'@mysten/sui': patch
---

Fix `normalizeStructTag` to reject top-level vector type strings with a clear error. Previously, calling `normalizeStructTag('vector<0x2::sui::SUI>')` would produce a corrupted result because the vector string was passed directly to `parseStructTag`, which misinterpreted it. The function now throws an error directing callers to use `normalizeTypeTag` instead.
