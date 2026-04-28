# @mysten/pas

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
