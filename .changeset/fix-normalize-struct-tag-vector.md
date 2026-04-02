---
'@mysten/sui': patch
---

Fix `normalizeStructTag` to correctly handle top-level vector type strings. Previously, calling `normalizeStructTag('vector<0x2::sui::SUI>')` would produce a corrupted result because the vector string was passed directly to `parseStructTag`, which misinterpreted it. The function now delegates vector types to `parseTypeTag`, which already handles vector wrapping correctly.
