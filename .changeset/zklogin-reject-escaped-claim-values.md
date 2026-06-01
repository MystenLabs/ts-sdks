---
'@mysten/sui': patch
---

zkLogin: `genAddressSeed` now rejects key claim name, value, or aud that contain a JSON escape (`"`, `\`, or a control character). The circuit derives the address seed from the raw JWT bytes, so an escaped claim value decodes differently than the circuit hashes and would yield a mismatched address. This is a stopgap; the complete fix is circuit-aligned claim parsing (see the TODO on `decodeJwt`).
