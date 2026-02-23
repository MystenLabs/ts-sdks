---
'@mysten/sui': patch
---

Fix `parseTypeTag` to correctly handle vector type parameters containing struct types (e.g. `vector<0x2::sui::SUI>`). Previously, the `::` inside the vector's type parameter caused the entire vector to be incorrectly parsed as a struct tag. Also reject malformed vector inputs like `vector<>` (empty type parameter) and `vector<u8` (missing closing bracket).
