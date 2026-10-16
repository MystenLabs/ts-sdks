---
'@mysten/sui': patch
---

Network failures while fetching or reading a gRPC-web server stream (such as `listTransactions`, `listEvents`, and `listCheckpoints` on `SuiGrpcClient`) now surface as `UNAVAILABLE` rather than `INTERNAL`, so they can be told apart from server failures and decode errors.
