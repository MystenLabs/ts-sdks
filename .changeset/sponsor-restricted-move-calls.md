---
'@mysten-incubation/sponsor': minor
---

`noRestrictedMoveCalls` takes `{ restrictedMoveCalls? }`, a list of `package`, `package::module` or
`package::module::function` entries, in place of `addressAliases` and `targets`, and throws if passed
any other option:

- `{ addressAliases: false }` → `{ restrictedMoveCalls: [] }`
- `{ targets: { X: ... } }` → `{ restrictedMoveCalls: ['0x2::address_alias', X] }`
- `'*'` with `except` → `allowedPackages` or `allowedFunctions`; other `except` lists → restrict the
  specific modules or functions instead
