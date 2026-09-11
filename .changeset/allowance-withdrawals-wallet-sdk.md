---
'@mysten/wallet-sdk': minor
---

Recognize `SenderAllowance` funds withdrawals in the transaction analyzer. Withdrawal inputs
report `withdrawFrom: 'SenderAllowance'` with the `funder` and `allowance`, and balance flows
attribute the withdrawn amount to the funder instead of the sender or gas owner.

Recognize `allowance::balance_spend` and `allowance::app_balance_spend`, tracking both funder debits
and recipient credits. Require funder and allowance details when narrowing allowance inputs.
