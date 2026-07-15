---
'@mysten/sui': patch
---

Forward `AbortSignal` from `SuiGrpcClient` method options to the underlying gRPC
requests. Previously methods like `listOwnedObjects` accepted a `signal` but never
passed it through, so passing `signal` did not cancel the request. MVR
(`resolveType`/`resolvePackage`/`resolve`) resolution is now also cancellable via the
same signal.
