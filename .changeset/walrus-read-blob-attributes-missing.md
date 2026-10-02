---
'@mysten/walrus': patch
---

Fix `readBlobAttributes` throwing for a blob whose attributes are absent or whose metadata field was removed: it now returns `null`, as its type says. This also fixes `writeBlobAttributes({ blobObjectId })` failing to add attributes on blobs with absent or removed metadata.
