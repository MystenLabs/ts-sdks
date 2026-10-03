---
'@mysten/hashi': patch
---

Read the guardian `/info` timestamp from `timestampMs`, its name in current guardian proxies, and fall back to `signedAtMs` for older ones. Against a current proxy, `RawGuardianInfo.signedAtMs` was always `null`.
