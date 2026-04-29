---
'@mysten/codegen': patch
---

Fix two codegen bugs:

- For functions with no Move arguments and no type parameters (e.g. `std::address::length`),
  the generated wrapper used `options: NameOptions = {}` even when `package: string` was
  required on the options interface. The `= {}` default no longer applies when `package` is
  required (i.e. when no MVR name/address is configured).
- For local packages whose `[package].name` in `Move.toml` differs from the address label in
  `[addresses]` (e.g. `name = "managed_coin"` with `[addresses].token_studio = "0x0"`), the
  prune logic identified the main package dir by `[package].name` and silently dropped the
  package's own modules. The main package dir is now resolved by intersecting the labels in
  the local Move.toml's `[addresses]` table with the summary subdirectories.
