# @mysten/deepbook-account

TypeScript SDK for the shared DeepBook **account primitive** — the reusable on-chain account
(`AccountWrapper`, `Auth`, custody balances) that DeepBook's core account wrapper and
[`@mysten/deepbook-predict`](../deepbook-predict) both build on. Builds ready-to-sign transaction
commands; it never signs and never touches keys.

## Install

```sh
npm i @mysten/deepbook-account @mysten/sui
```

`@mysten/sui` is a peer dependency.

## Model

An owner has one canonical `AccountWrapper`, a **derived object** of the account registry — so its
id is computable off-chain with no chain read. The wrapper holds an `Account` whose custody balances
apps deposit into and withdraw from; app-specific data hangs off it under an app-keyed slot.
Authority is a hot-potato `Auth` minted from the transaction sender and consumed by the very next
account-loading call.

## Usage

`AccountContract` takes only the deployed ids of the `account` package, so each consumer drives it
against **its own** deployment:

```ts
import { Transaction } from '@mysten/sui/transactions';
import { AccountContract } from '@mysten/deepbook-account';

const account = new AccountContract({
	ACCOUNT_PACKAGE_ID: '0x…',
	ACCOUNT_REGISTRY_ID: '0x…',
});

// The owner's canonical wrapper id — derived, no chain read.
const wrapperId = account.deriveAccountWrapperId(owner);

// One-time onboarding, funded in a single PTB.
const tx = new Transaction();
tx.add(account.createAccountAndDeposit({ coin, coinType: USDC }));

// Or, against an existing account:
tx.add(account.depositFunds({ wrapperId, coin, coinType: USDC }));
const withdrawn = tx.add(account.withdrawFunds({ wrapperId, amount: 1_000_000n, coinType: USDC }));
```

`DeepBookConfig` structurally satisfies `AccountConfig`, so a `@mysten/deepbook-v3` config can be
passed directly once DeepBook's account wrapper is deployed.

## What's in the box

- **`AccountContract`** — `deriveAccountWrapperId`, `generateAuth`, `createAccount`,
  `createAccountAndDeposit`, `depositFunds`, `withdrawFunds`, `loadAccount`, `balance`. Each builder
  returns a `(tx: Transaction) => …` thunk, so it composes into any PTB via `tx.add(...)` alongside
  an app's own calls.
- **Generated bindings** — the move-call thunks and BCS structs under `contracts/` (exported as
  `accountMoveCalls`, `accountRegistryMoveCalls`, `accountEvents`, plus `Account` /
  `AccountWrapper`) for consumers composing their own PTBs, parsing account objects, or decoding
  account events.

## Reads

`balance` and `loadAccount` are read-side compositions: run them through your client's
`simulateTransaction` and decode the returned BCS. `balance` chains `load_account` → `balance<T>`;
read the u64 return of the **last** command.

## Development

```sh
pnpm install
pnpm test   # offline unit suite (command shape, derivation, arg slots)
pnpm build  # ESM + d.ts via tsdown
```
