# @mysten/pas

## 0.2.9

## 0.2.8

## 0.2.7

## 0.2.6

## 0.2.5

## 0.2.4

## 0.2.3

## 0.2.2

## 0.2.1

## 0.2.0

### Minor Changes

- bbf63cb: Add `typeTag` and `resolveTypeTag` methods to the generated `MoveStruct`, `MoveEnum`, and
  `MoveTuple` classes.

  - `typeTag(options?)` builds the type tag string for a generated type. `typeArguments` is the full
    positional list of type arguments in Move declaration order; each entry is a type tag string,
    another `typeTag()` result, or a BCS type (its name is used). Types with unfilled phantom
    parameters require `typeArguments` at compile time, and argument arity is validated at runtime.
  - `resolveTypeTag({ client, ... })` builds the tag, resolves MVR names through
    `client.core.mvr.resolveType`, and returns the normalized address-only form suitable for queries
    and comparisons against on-chain data.

- bbf63cb: Updated dependencies

## 0.1.4

### Patch Changes

- ca17d58: Add mainnet constants

## 0.1.3

### Patch Changes

- f7de3e5: Restore docs in published tarballs.
- Updated dependencies [f7de3e5]
  - @mysten/sui@2.16.2

## 0.1.2

### Patch Changes

- 9e067cf: Validate the new per-package release flow end-to-end across every public @mysten package.
  No functional changes — empty patch bump to force the orchestrator to dispatch every
  release-<pkg>.yml workflow with `dry_run=false` so each package publishes via OIDC trusted
  publishing.
- Updated dependencies [9e067cf]
  - @mysten/sui@2.16.1

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
