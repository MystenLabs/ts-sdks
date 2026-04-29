---
'@mysten/codegen': patch
---

Fix off-by-one in utils/ import paths for multi-segment package names. Generated modules
imported utils as `../utils/index.js`, anchored to a virtual single-segment package directory.
When `packageName` contains a slash (e.g. callers nesting output under `move/<pkg>/` to mirror
Move source layout), the import resolved into a sibling subdirectory of `outputDir` instead of
to the actual `outputDir/utils/`. Utils imports are now anchored at the codegen output root, so
they work regardless of `packageName` depth.
