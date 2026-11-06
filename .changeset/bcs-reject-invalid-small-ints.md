---
'@mysten/bcs': patch
---

Reject `NaN` and non-integer values for `u8`, `u16` and `u32` instead of silently writing them as 0 or a truncated integer, and throw on negative ULEB128 values instead of returning an empty encoding.
