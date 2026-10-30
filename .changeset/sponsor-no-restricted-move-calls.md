---
'@mysten-incubation/sponsor': minor
---

**Behaviour change:** `defaults()` now includes `noRestrictedMoveCalls()`, so sponsors using the default validators reject calls into `0x2::address_alias` with `RESTRICTED_MOVE_CALL`, including sponsors that allowed them before. To keep sponsoring alias changes, leave it out of your validator list or pass `noRestrictedMoveCalls({ addressAliases: false })`. Pass `targets` to restrict more packages, modules or functions; invalid targets or levels throw when the validator is created.
