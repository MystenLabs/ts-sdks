---
'@mysten/sui': patch
---

Fix `extractMvrTypes` and `replaceMvrNames` to handle vector and primitive type parameters. Previously, these functions passed all string type parameters directly to `parseStructTag`, which produced corrupted results for vector types (e.g., `vector<@mvr/demo::baz::Qux>`) and threw on primitives (e.g., `u8`). Vector types are now unwrapped and recursed into, and primitive types are passed through unchanged.
