---
'@mysten/sui': patch
---

zkLogin: `genAddressSeed` now rejects key claim name, value, or aud that contain a JSON escape (`"`, `\`, or a control character).
