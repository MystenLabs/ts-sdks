# Deepbook TypeScript SDK

## Entry points

| Import                        | Contents                                                                                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@mysten/deepbook-v3`         | DeepBook spot and margin — pools, orders, balance managers, flash loans, governance, margin managers/pools, TPSL.                                                                                    |
| `@mysten/deepbook-v3/account` | The shared on-chain **account primitive** (`AccountContract`): the canonical `AccountWrapper`, `Auth`, and custody balances that DeepBook's core account wrapper and DeepBook Predict both build on. |

Subpaths are separate module graphs — importing `@mysten/deepbook-v3/account` does not load any spot
or margin code.

### `@mysten/deepbook-v3/account`

An owner has one canonical `AccountWrapper`, a **derived object** of the account registry, so its id
is computable off-chain with no chain read. `AccountContract` takes only the deployed ids of the
`account` package, so each consumer drives it against **its own** deployment:

```ts
import { Transaction } from '@mysten/sui/transactions';
import { AccountContract } from '@mysten/deepbook-v3/account';

const account = new AccountContract({
	accountPackageId: '0x…',
	accountRegistry: '0x…',
});

const wrapperId = account.deriveAccountWrapperId(owner);

const tx = new Transaction();
tx.add(account.depositFunds({ wrapperId, coin, coinType: USDC }));
```

> `Account` exported from the package root is `@deepbook/core::account::Account` (the per-pool
> trading account). The account primitive's `Account` is a different type with an unrelated layout
> and is exported only from the `/account` subpath.
