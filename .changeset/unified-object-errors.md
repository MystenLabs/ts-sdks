---
'@mysten/sui': minor
---

Unify `ObjectError` across all transports. `ObjectError` now carries a
transport-agnostic `code: 'notFound' | 'deleted' | 'unknown'` and a non-nullable
`objectId`, and works identically regardless of whether the client is backed by
JSON-RPC, gRPC, or GraphQL.

`ObjectError`'s constructor `options` arg is now optional — consumers can
construct `ObjectError` directly without ceremony, and the base-class
`transportDetails` field is honestly optional.

JSON-RPC distinguishes `'deleted'` from never-existed at the wire level, so it
maps `deleted` → `'deleted'` and `notExists`/`dynamicFieldNotFound` → `'notFound'`.
gRPC and GraphQL cannot distinguish (gRPC's `NOT_FOUND` is not specific; GraphQL
omits absent objects without saying why), so both collapse to `'notFound'`. The
raw wire payload is preserved on `error.transportDetails` for consumers who need
to discriminate further.

When `client.core.getObjects` resolves multiple invalid ids in a transaction,
the new `AggregateObjectError extends SuiClientError` is thrown with all
errors on `.errors`. A single invalid id still throws the bare `ObjectError`.

Adds `TransportDetails`, a tagged union lifted onto the `SuiClientError` base
class that exposes the raw per-transport payload (JSON-RPC response, gRPC
`google.rpc.Status`, or a GraphQL tag) via `error.transportDetails`.

`ObjectError.objectId` is always a real object id. In the rare JSON-RPC case
where the server returns an error that identifies no specific object (e.g. a
`displayError` surfaced during `listOwnedObjects`), a base `SuiClientError`
is thrown instead — consumers who catch `SuiClientError` still catch everything.

`GraphQLResponseError` now extends `SuiClientError`, and the multi-error path
wraps the aggregate in `SuiClientError` with `transportDetails: { $kind: 'graphql' }`
on the cause. `instanceof SuiClientError` is now genuinely universal across
all three transports.

Also narrows `GetObjectsResponse.objects` from `(Object | Error)[]` to
`(Object | ObjectError)[]`. Because `ObjectError extends Error`, existing
`instanceof Error` checks continue to work unchanged.

Newly exports `SuiClientError` (base class), `ObjectError`,
`AggregateObjectError`, `ObjectErrorCode`, and `TransportDetails` from
`@mysten/sui/client`. Use `instanceof SuiClientError` as the universal catch
contract for any error originating from the client; use `instanceof ObjectError`
and switch on `error.code` when you need per-object detail.
