---
'@mysten/sui': patch
---

Fix the `name` of gRPC size, type argument, package upgrade, coin deny list, congestion and object
ID execution errors, which were looked up in the command argument error enum. Effects decoded from
BCS (including GraphQL effects) now use the same names as gRPC for `InvalidBcsBytes`,
`InvalidUsageOfPureArgument`, `ConsensusObjectOperationNotAllowed` and `PackageIdDoesNotMatch`.
