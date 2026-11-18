---
'@mysten/sui': major
---

Update the generated gRPC types to the latest `sui-apis`. `GetPackageRequest` has a `selector`
oneof, which its type marks as required. Requests with unset oneof fields no longer throw.
