---
'@mysten/wallet-sdk': minor
---

Recognize `SenderAllowance` funds withdrawals in the transaction analyzer. Withdrawal inputs
report `withdrawFrom: 'SenderAllowance'` with the `funder` and `allowance`, and balance flows
attribute the withdrawn amount to the funder instead of the sender or gas owner.

Recognize `allowance::balance_spend` and `allowance::app_balance_spend`, tracking both funder debits
and recipient credits. Require funder and allowance details when narrowing allowance inputs.

Reject balance-flow analysis when a withdrawal's redemption cannot be tracked, including allowance
withdrawals passed to custom Move functions. This prevents opaque self-funded allowance spends
from bypassing auto-approval token budgets.
