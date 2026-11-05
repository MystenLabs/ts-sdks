---
'@mysten/sui': minor
---

`client.core.listDynamicFields` accepts `include: { value: true }`. For a dynamic object field,
`value` is the child object's type and BCS content on `SuiGrpcClient` too, matching
`SuiGraphQLClient` and `valueType` (it was the child's ID). `getDynamicField` always sets
`valueType`.
