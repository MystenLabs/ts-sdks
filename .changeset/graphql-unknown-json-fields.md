---
'@mysten/sui': patch
---

`SuiGraphQLClient` ignores fields and enum values it does not know in transaction, effects and
balance-change JSON, so responses from a newer server still parse.
