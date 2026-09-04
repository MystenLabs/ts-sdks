---
'@mysten/sui': minor
---

Add wire-level support for `SenderAllowance` funds withdrawals (`sui::allowance`, protocol v137).
`bcs.WithdrawFrom`, the transaction input schema, `Inputs.FundsWithdrawal`, and `tx.withdrawal()`
accept `{ $kind: 'SenderAllowance', SenderAllowance: { funder, allowance } }`, and the gRPC,
GraphQL, and JSON-RPC clients decode and encode the new source when reading, simulating, and
resolving transactions.
