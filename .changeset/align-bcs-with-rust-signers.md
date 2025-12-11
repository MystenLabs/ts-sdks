---
'@mysten/signers': major
---

Remove manual BCS serialization from ledger signer

**Breaking Changes:**

- **Removed `SuiMoveObject` export**: The custom BCS schema for Move objects has been removed. The ledger signer now uses server-provided BCS bytes directly.
- **Client type change**: `LedgerSigner` and `getInputObjects` now accepts `ClientWithCoreApi` instead of `SuiJsonRpcClient` (this is still compatible with `SuiJsonRpcClient`)
