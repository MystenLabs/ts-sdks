---
'@mysten-incubation/sponsor': minor
---

Add `noRestrictedMoveCalls(options?)` to `defaults()`. It rejects MoveCalls that `restrictedMoveCalls` flags (`RESTRICTED_MOVE_CALL`), which by default are calls that change the sender's address aliases.
