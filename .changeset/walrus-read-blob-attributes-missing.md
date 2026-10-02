---
'@mysten/walrus': patch
---

Fix `readBlobAttributes` throwing for a blob with no attributes yet: it now returns `null`, as its type says. This also fixes `writeBlobAttributes({ blobObjectId })` failing to add a blob's first attributes.
