---
'@mysten/sui': minor
---

Add wire-level support for `SenderAllowance` funds withdrawals (`sui::allowance`, protocol v137).
`bcs.WithdrawFrom`, the transaction input schema, `Inputs.FundsWithdrawal`, and `tx.withdrawal()`
accept `{ $kind: 'SenderAllowance', SenderAllowance: { funder, allowance } }`, and the gRPC,
GraphQL, and JSON-RPC clients decode and encode the new source when reading, simulating, and
resolving transactions.

Add `tx.balance({ allowance, balance, type })` and `tx.coin({ allowance, balance, type })` to resolve
plain allowance IDs and redeem their withdrawals automatically. A known `{ objectId, funder }`
reference skips metadata lookup. Allowance spends never fall back to the sender's funds.
Both helpers accept decimal strings for `balance`. App-bound allowances remain supported through the low-level withdrawal API.

Account for allowance reservations when selecting ordinary coins and gas, including transactions
where the sender or gas sponsor is also the allowance's funder.
