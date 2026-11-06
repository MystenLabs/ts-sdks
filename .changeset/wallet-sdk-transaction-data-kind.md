---
'@mysten/wallet-sdk': patch
---

The `json-rpc-compat` helpers read inputs and commands from the transaction `kind`, and throw for an
`Unknown` kind instead of building an incomplete response.
