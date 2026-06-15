---
'@mysten/codegen': minor
'@mysten/walrus': minor
'@mysten/suins': minor
'@mysten/kiosk': minor
'@mysten/deepbook-v3': minor
'@mysten/payment-kit': minor
'@mysten/pas': minor
---

Add `typeTag` and `resolveTypeTag` methods to the generated `MoveStruct`, `MoveEnum`, and `MoveTuple` classes.

- `typeTag(options?)` builds the type tag string for a generated type. `typeArguments` is the full positional list of type arguments in Move declaration order; each entry is a type tag string, another `typeTag()` result, or a BCS type (its name is used). Types with unfilled phantom parameters require `typeArguments` at compile time, and argument arity is validated at runtime.
- `resolveTypeTag({ client, ... })` builds the tag, resolves MVR names through `client.core.mvr.resolveType`, and returns the normalized address-only form suitable for queries and comparisons against on-chain data.
