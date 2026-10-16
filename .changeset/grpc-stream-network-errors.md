---
'@mysten/sui': patch
---

Network failures in gRPC-web server streams (such as `listTransactions`, `listEvents`, and `listCheckpoints` on `SuiGrpcClient`) now report `UNAVAILABLE` instead of `INTERNAL`, so they can be told apart from server and decode errors.
