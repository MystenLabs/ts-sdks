---
'@mysten/bcs': patch
---

Reject non-canonical encodings when decoding: `bool` values other than `0` or `1`, non-minimal ULEB128 encodings (used for lengths and enum variant indices) and strings that are not valid UTF-8. Strings now also keep a leading byte order mark instead of silently dropping it
