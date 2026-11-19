---
'@mysten/sui': patch
---

`SuiGraphQLClient` fills `cleverError.errorCode` on Move aborts, and reports a `cleverError` for
clever aborts that have only a line number, matching `SuiGrpcClient`.
