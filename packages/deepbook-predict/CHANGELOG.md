# @mysten/deepbook-predict

## 0.0.1

### Patch Changes

- eefb735: Add `@mysten/deepbook-predict`, the TypeScript SDK for DeepBook Predict (European
  cash-settled range digitals). The `PredictClient` facade offers transaction builders (trade, PLP,
  account, builder codes), chain-only reads including market discovery, quotes, and position
  enumeration, and typed execution-receipt decoders — all built on `sui-ts-codegen`-generated
  contract bindings, with Move aborts surfaced as typed errors via clever-error decoding.
  Withdrawals default to depositing into the owner's DUSDC address balance
  (`0x2::coin::send_funds`), with a `{ toCoinObject: true }` opt-out for a discrete `Coin<T>`.
  Targets the live testnet deployment (`predict-testnet-7-29`); `getConfig('mainnet')` throws until
  Predict is deployed to mainnet.
