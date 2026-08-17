# @mysten/deepbook-account

## 0.0.1

### Patch Changes

- af5efc8: Add `@mysten/deepbook-account`, the SDK for the shared on-chain account primitive
  (`packages/account`) that DeepBook's core account wrapper and DeepBook Predict both build on.
  `AccountContract` exposes the transaction builders — `createAccount`, `createAccountAndDeposit`,
  `depositFunds`, `withdrawFunds`, `generateAuth`, `loadAccount`, `balance` — plus
  `deriveAccountWrapperId`, which computes an owner's canonical wrapper id off-chain with no chain
  read. It takes only the deployed ids of the `account` package (`AccountConfig`), so each consumer
  drives it against its own deployment. The generated Move bindings and BCS structs are exported for
  callers composing their own PTBs or decoding account state and events.
