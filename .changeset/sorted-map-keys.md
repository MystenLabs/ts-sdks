---
'@mysten/bcs': minor
---

Add automatic sorting of map entries by serialized key bytes in `bcs.map()` to match Rust's BTreeMap BCS serialization. Also exports `compareBcsBytes` helper for lexicographic byte comparison.
