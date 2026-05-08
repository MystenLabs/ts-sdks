---
'@mysten/walrus': patch
---

Add `storageNodeUrlScheme` option to `WalrusClient` for configuring the URL scheme used when contacting storage nodes (defaults to `'https'`). Set to `'http'` for local development environments where storage nodes do not terminate TLS.
