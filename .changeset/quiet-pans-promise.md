---
"@mysten/walrus": patch
---

Fix quilt blob sorting in `encodeQuilt` by avoiding in-place mutation of the input `blobs` array while preserving existing sorting behavior.