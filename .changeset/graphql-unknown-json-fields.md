---
'@mysten/sui': patch
---

`SuiGraphQLClient` ignores fields it does not know in transaction, effects and balance-change JSON,
and enum values it does not know in effects and balance changes, so responses from a newer server
still parse. In transaction data, an enum value it does not know is mapped as on `SuiGrpcClient`:
a newer transaction kind or input reads as `Unknown`.
