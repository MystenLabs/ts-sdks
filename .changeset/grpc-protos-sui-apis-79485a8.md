---
'@mysten/sui': major
---

Update the generated gRPC types to the latest `sui-apis`. `GetPackageRequest` gains a required
`selector` oneof (pass `selector: { oneofKind: undefined }` to keep reading the package stored at
`packageId`). New fields and values: `LedgerPosition` and `Watermark.cursorPosition`, start and end
transaction and event indexes on `ListTransactionsRequest` and `ListEventsRequest`, the
`SignatureScheme.MLDSA65` scheme, the `INSUFFICIENT_GAS_BALANCE`, `TRANSACTION_EXECUTION_FAILED`,
`ABOVE_LATEST_AVAILABLE` and `BELOW_EARLIEST_AVAILABLE` error reasons, and the
`FORWARDING_ADDRESS_REGISTRY_CREATE` end-of-epoch kind, which gRPC transaction data now maps to
`ForwardingAddressRegistryCreate` instead of `Unknown`.
