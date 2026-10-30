---
'@mysten/wallet-sdk': minor
---

Add an `addressAliasCalls` analyzer that finds MoveCalls into `0x2::address_alias`. `autoApprovalAnalyzer` now includes it, and `AutoApprovalManager` never auto-approves a transaction that enables or changes address aliases, whatever the policy allows.
