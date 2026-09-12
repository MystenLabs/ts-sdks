---
'@mysten/sui': minor
---

Add wire-level support for `SenderAllowance` funds withdrawals (`sui::allowance`, protocol v137).
`bcs.WithdrawFrom`, the transaction input schema, `Inputs.FundsWithdrawal`, and `tx.withdrawal()`
accept `{ $kind: 'SenderAllowance', SenderAllowance: { funder, allowance } }`, and the gRPC,
GraphQL, and JSON-RPC clients decode and encode the new source when reading, simulating, and
resolving transactions.

Add `tx.balance({ allowance, balance, type })` and `tx.coin({ allowance, balance, type })` to resolve
allowance IDs and redeem their withdrawals automatically. A known `{ objectId, funder }`
reference skips metadata lookup. Allowance spends never fall back to the sender's funds.
A shared resolver handles the separate allowance and coin intents, reserving allowance withdrawals
before ordinary coin selection.
Both helpers accept decimal strings for `balance`. App-bound allowances accept
`{ objectId, app: { type, permit }, funder? }` with a `SpendPermit<A>` from an app authorization call.

Account for allowance reservations when selecting ordinary coins and gas, including transactions
where the sender or gas sponsor is also the allowance's funder.

Resolve MVR coin and app types before allowance metadata checks, and fetch allowance metadata in
parallel batches. Honor custom allowance resolver dependencies regardless of command order.
Require decimal digits in string amounts, rejecting empty or whitespace-only values.
Upgrade read-only allowance inputs to mutable when spending, including with a known funder.
