---
'@mysten/sui': minor
---

`client.core.listDynamicFields` now accepts `include: { value: true }` to return each field's value, matching `SuiGrpcClient` and `SuiGraphQLClient`. For a dynamic object field, both transports now return the child object's content as the value.
