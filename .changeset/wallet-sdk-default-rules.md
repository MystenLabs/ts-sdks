---
'@mysten/wallet-sdk': minor
---

Add `analyzers.defaultRules`, a set of safety checks that adds an issue for each problem it finds. Its first check, `analyzers.addressAliasChanges`, adds an issue for each MoveCall into `0x2::address_alias`, because such calls change which addresses can sign for the account. Pass `allowAddressAliasChanges: true` to turn the check off. `autoApprovalAnalyzer` now depends on `defaultRules`, so its result is `partial` when a rule fails, and `AutoApprovalManager` doesn't auto-approve it.
