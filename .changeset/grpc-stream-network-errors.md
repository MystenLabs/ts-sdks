---
'@mysten/sui': patch
---

Network failures in gRPC-web calls on `SuiGrpcClient`, unary calls and server streams (such as `listTransactions`, `listEvents`, and `listCheckpoints`) alike, now report `UNAVAILABLE` instead of `INTERNAL`, so they can be told apart from server and decode errors. A binary response body that ends early now also reports `UNAVAILABLE`, rather than `DATA_LOSS` or, for a trailer cut mid-frame, success.
