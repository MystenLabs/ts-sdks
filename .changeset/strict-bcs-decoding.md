---
'@mysten/bcs': patch
---

Reject non-canonical encodings when decoding: `bool` values other than `0` or `1`, non-minimal ULEB128 encodings (used for lengths and enum variant indices), strings that are not valid UTF-8, and maps whose keys are unsorted or duplicated
