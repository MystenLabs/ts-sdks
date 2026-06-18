---
'@mysten-incubation/sponsor': minor
---

`Sponsor.signAndExecuteTransaction` now threads through every core `executeTransaction`
prop (`signal`, etc.) and accepts a generic `include`, combined with the always-on
`effects` so the result type reflects exactly what was requested. The dry-run that backs
validation can likewise be extended: a validator declares the simulate `include` fields it
needs (e.g. `include: { balanceChanges: true }`) and that requirement surfaces, typed, on
`validationOptions` — `effects` stays forced on in both paths and can't be turned off.
