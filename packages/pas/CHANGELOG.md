# @mysten/pas

## 0.1.1

### Patch Changes

- bb8d26a: Fix three latent type errors in the generated `utils/index.ts` that surfaced for
  consumers with `noUncheckedIndexedAccess: true`:
  - `getPureBcsSchema(structTag.typeParams[0])` passed `TypeTag | undefined` to a parameter typed
    `string | TypeTag`. Now null-checks the inner tag before passing it.
  - `argTypes[i]` was redundantly re-indexed inside a `for…of entries()` loop, returning
    `string | null | undefined` and being passed back to `getPureBcsSchema`. Switched to the loop
    variable, which is `string | null`.
  - `MoveStruct.get()` returned the destructured `[res]` from `getMany([objectId])` without
    asserting it was defined. Now throws if no object was returned.

  The codegen test suite gained a `tsc`-based check that compiles the generated `utils/index.ts`
  under strict + `noUncheckedIndexedAccess`, so embedded-template type bugs are caught before
  release rather than by downstream consumers.

  All consumer packages (`payment-kit`, `pas`, `walrus`, `suins`, `deepbook-v3`, `kiosk`) have been
  regenerated with the fix.

## 0.1.0

### Minor Changes

- c96956e: Regenerate generated Move types against the latest contract sources. The generated
  `utils/index.ts` `GetOptions` / `GetManyOptions` are now exported as type aliases (intersection)
  instead of interfaces. SuiNS gains `SubnamePrunedEvent`, `pruneExpiredSubname`, and
  `pruneExpiredSubnames`.

## 0.0.3

### Patch Changes

- 6fd995d: Use type imports in generated code for verbatimModuleSyntax compatibility

## 0.0.2

### Patch Changes

- fd00b1d: Adds a README file
- Updated dependencies [c769abb]
  - @mysten/sui@2.9.0
