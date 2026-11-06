---
'@mysten/wallet-standard': minor
---

`SuiJsonRpcTypes.SuiWithdrawFrom` matches JSON-RPC's serialization, including
`{ senderAllowance: { funder, allowance } }` for allowance-funded withdrawals, unlike the
`'sender' | 'sponsor'` type in the removed `@mysten/sui/jsonRpc`.
