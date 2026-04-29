---
'@mysten/codegen': patch
'@mysten/deepbook-v3': patch
'@mysten/kiosk': patch
'@mysten/pas': patch
'@mysten/payment-kit': patch
'@mysten/suins': patch
'@mysten/walrus': patch
---

Fix three latent type errors in the generated `utils/index.ts` that surfaced for consumers
with `noUncheckedIndexedAccess: true`:

- `getPureBcsSchema(structTag.typeParams[0])` passed `TypeTag | undefined` to a parameter
  typed `string | TypeTag`. Now null-checks the inner tag before passing it.
- `argTypes[i]` was redundantly re-indexed inside a `for…of entries()` loop, returning
  `string | null | undefined` and being passed back to `getPureBcsSchema`. Switched to the
  loop variable, which is `string | null`.
- `MoveStruct.get()` returned the destructured `[res]` from `getMany([objectId])` without
  asserting it was defined. Now throws if no object was returned.

The codegen test suite gained a `tsc`-based check that compiles the generated `utils/index.ts`
under strict + `noUncheckedIndexedAccess`, so embedded-template type bugs are caught before
release rather than by downstream consumers.

All consumer packages (`payment-kit`, `pas`, `walrus`, `suins`, `deepbook-v3`, `kiosk`) have
been regenerated with the fix.
