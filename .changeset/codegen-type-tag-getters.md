---
'@mysten/codegen': minor
'@mysten/walrus': minor
'@mysten/suins': minor
'@mysten/kiosk': minor
'@mysten/deepbook-v3': minor
'@mysten/payment-kit': minor
'@mysten/pas': minor
---

Add `typeTag`, `resolveTypeTag`, and `withTypeArguments` methods to the generated `MoveStruct`, `MoveEnum`, and `MoveTuple` classes.

- `typeTag(options?)` builds the type tag string for a generated type. `typeArguments` is the full positional list in Move declaration order: phantom positions accept any type, while instantiated positions are validated against the type the instance was created with (package identifiers — short addresses, normalized addresses, and MVR names — are interchangeable). Argument arity and positions are checked at compile time when names are statically known, and validated at runtime otherwise.
- `resolveTypeTag({ client, ... })` builds the tag, resolves MVR names through `client.core.mvr.resolveType`, and returns the normalized address-only form suitable for queries and comparisons against on-chain data.
- `withTypeArguments(typeArguments)` returns a copy of the BCS type with type arguments applied to its name, so fully-instantiated types can be composed and passed as type parameters to other generated types.
