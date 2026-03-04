---
'@mysten/sui': patch
---

Fix gas payment resolution to check sender's address balance when sender is their own gas payer. Previously, address balance was only checked for sponsored transactions, causing "No valid gas coins found" errors for accounts with sufficient address balance but no coin objects.
