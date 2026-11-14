Captured from a `sui start --with-faucet` localnet on
`mysten/sui-tools:e04cf9aa915cb6c069092733bebc3648755998e2` (mainnet-v1.81.1): each file pairs the
fullnode's `sui_dryRunTransactionBlock` and `sui_executeTransactionBlock` (all `show*` options)
responses with the `SuiGrpcClient` `simulateTransaction` and `getTransaction` results for the same
transaction. `Uint8Array` values are stored as `{ "$bytes": "<base64>" }`.
