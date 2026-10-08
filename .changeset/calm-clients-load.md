---
'@mysten/enoki': minor
---

Add a client-only `@mysten/enoki/client` entry point exporting `EnokiClient`, `EnokiClientError`, and
their supporting configuration, network, and authentication-provider types without loading wallet
helpers or local zkLogin cryptography.
