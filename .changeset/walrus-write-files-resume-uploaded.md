---
'@mysten/walrus': patch
---

Fix resuming `writeFiles` / `writeFilesFlow().run()` from an `uploaded` step, which failed with "upload must be executed before calling certify". Certified checkpoints also rebuild the quilt index and return file references without repeating completed steps. The files flow now hands its steps to the blob flow's `run()`, which restores the saved upload certificate.
