---
'@mysten/wallet-sdk': minor
---

Export the `Analyzer` type from the transaction analyzer. This lets downstream packages annotate
custom analyzers (`const myAnalyzer: Analyzer<...> = createAnalyzer({...})`) so their declaration
output stays portable.
