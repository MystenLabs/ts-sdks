---
'@mysten/sui': patch
---

`SuiGraphQLClient` fills `cleverError.errorCode` on Move aborts, and reports a `cleverError` for
clever aborts that have only a line number, matching `SuiGrpcClient`. `SuiGrpcClient` Move abort
messages now include the base64 value of a clever error constant that can't be rendered, as
`SuiGraphQLClient` messages do.
