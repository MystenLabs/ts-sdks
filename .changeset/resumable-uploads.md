---
'@mysten/walrus': minor
---

Add resumable upload support to upload flows

- `writeBlobFlow()` and `writeFilesFlow()` accept a `resume` option with prior step state. When resuming, completed steps are skipped and blob consistency is validated.
- New `run()` method on flows that runs the full pipeline (encode → register → upload → certify), yielding step results.
- `executeRegister()` / `executeCertify()` convenience methods flows for executing transactions directly rather than returning transactions
- added `onStep` / `resume` on `writeBlob()` and `writeFiles()` methods. `writeBlob()` and `writeFiles()` now use the flow methods internally
- `writeEncodedBlobToNode()` now checks metadata and sliver status before uploading, matching the Rust SDK's upload flow. Previously stored slivers are skipped to avoid re-sending large data on resume.
