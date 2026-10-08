---
'@mysten/walrus': patch
---

Fix reading a quilt patch from secondary slivers when its content starts part way into a column: the reader fetched one sliver too few (so the end of the content came back as zeros) and kept the first column's offset for the next one.
