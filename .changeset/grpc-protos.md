---
'@mysten/sui': major
---

Update the generated gRPC types to the latest `sui-apis`. `GetPackageRequest` has a required
`selector` oneof: pass `selector: { oneofKind: undefined }` to read the package stored at
`packageId`.
