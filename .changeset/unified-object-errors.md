---
'@mysten/sui': minor
---

Unify `ObjectError` across all transports. `ObjectError` now carries a
transport-agnostic `code: 'notFound' | 'unknown'` and a non-nullable `objectId`,
and works identically regardless of whether the client is backed by JSON-RPC,
gRPC, or GraphQL.

JSON-RPC's five `ObjectResponseError` wire codes (`notExists`, `deleted`,
`dynamicFieldNotFound`, `displayError`, `unknown`) are normalized on the way in:
`notExists`, `deleted`, and `dynamicFieldNotFound` all surface as `'notFound'`;
`displayError` and `unknown` surface as `'unknown'`. The raw wire payload is
still available on `error.transportDetails` for consumers that need the richer
detail.

Adds `TransportDetails`, a tagged union lifted onto the `SuiClientError` base
class that exposes the raw per-transport payload (JSON-RPC response, gRPC
`google.rpc.Status`, or a GraphQL tag) via `error.transportDetails`.

`ObjectError.objectId` is always a real object id. In the rare JSON-RPC case
where the server returns an error that identifies no specific object (e.g. a
`displayError` surfaced during `listOwnedObjects`), a base `SuiClientError`
is thrown instead — consumers who catch `SuiClientError` still catch everything.

Also narrows `GetObjectsResponse.objects` from `(Object | Error)[]` to
`(Object | ObjectError)[]`. Because `ObjectError extends Error`, existing
`instanceof Error` checks continue to work unchanged.

Newly exports `SuiClientError` (base class), `ObjectError`, `ObjectErrorCode`,
and `TransportDetails` from `@mysten/sui/client`. Use `instanceof SuiClientError`
as the universal catch contract for any error originating from the client; use
`instanceof ObjectError` and switch on `error.code` when you need per-object detail.
