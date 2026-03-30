---
'@mysten/sui': patch
---

Fix JSON-RPC simulateTransaction includes when dryRun fails for non-public functions with checksEnabled: false. balanceChanges and objectTypes no longer return incorrect data from failed dryRun, and the transaction include no longer crashes for unbuilt Transaction objects.
