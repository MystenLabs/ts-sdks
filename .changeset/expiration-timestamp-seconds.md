---
'@mysten/sui': patch
---

Treat `ValidDuring` and `Validity` `minTimestamp` and `maxTimestamp` as Unix seconds when converting to and from gRPC. They were treated as milliseconds.
