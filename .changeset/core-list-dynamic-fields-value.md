---
'@mysten/sui': major
---

`client.core.listDynamicFields` accepts `include: { value: true }`. For dynamic object fields, `getDynamicField` and `listDynamicFields` now return the child object's type and content as `value` (previously the child's ID) and the name type without the `Wrapper`. `getDynamicField` now always sets `valueType`.
