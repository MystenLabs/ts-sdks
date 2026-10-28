---
'@mysten/sui': minor
---

`client.core.listDynamicFields` now accepts `include: { value: true }` to return each field's value. For dynamic object fields, `listDynamicFields` and `getDynamicField` now both return the child object's type and content as `value` (previously the child's ID) and report the name type without the `Wrapper`; `getDynamicField` also now sets `valueType`.
