---
'@mysten/wallet-standard': minor
---

`SuiJsonRpcTypes.SuiWithdrawFrom` also accepts `{ senderAllowance: { funder, allowance } }`, which
`@mysten/wallet-sdk/json-rpc-compat` returns for allowance-funded withdrawals.
