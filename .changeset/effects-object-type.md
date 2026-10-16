---
'@mysten/sui': major
---

Add `objectType: string | null` to `SuiClientTypes.ChangedObject`, so entries in
`effects.changedObjects` and `effects.gasObject` carry the object's type. Code that constructs
`ChangedObject` values, such as test mocks, must now set it.
