---
'@mysten/sui': patch
---

Regenerate the GraphQL schema and `gql.tada` introspection types from upstream, picking up the new
`ForwardingAddressRegistryCreateTransaction` system transaction variant on the
`EndOfEpochTransactionKind` union. gRPC proto types were also regenerated and are unchanged.
