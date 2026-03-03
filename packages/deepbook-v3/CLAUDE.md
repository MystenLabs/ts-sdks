# CLAUDE.md - DeepBook V3 Package

This file contains package-specific guidance for Claude Code when working with the deepbook-v3
package.

**IMPORTANT**: Update this file whenever new patterns, gotchas, or important information is learned
while working in this package. This helps future sessions avoid repeating the same investigations.

## Overview

DeepBook V3 is a decentralized exchange (DEX) SDK for Sui blockchain. It provides client extensions
for interacting with DeepBook pools, margin managers, and flash loans.

## Package Structure

```
packages/deepbook-v3/
├── src/
│   ├── index.ts           # Main entry point, exports deepbook() extension
│   ├── client.ts          # DeepBookClient class with high-level methods
│   ├── transactions/      # Transaction builders for Move calls
│   │   ├── pool.ts        # Pool operations (place orders, get quotes, etc.)
│   │   ├── marginManager.ts # Margin manager operations
│   │   ├── flashLoan.ts   # Flash loan operations
│   │   └── ...
│   └── utils/
│       └── config.ts      # Network configuration and coin types
├── examples/              # Usage examples
└── tests/
```

## Key Concepts

### Client Extension Pattern

DeepBook uses the Sui client extension pattern via `$extend()`:

```typescript
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { deepbook } from '@mysten/deepbook-v3';

const client = new SuiGrpcClient({ network: 'mainnet', baseUrl: '...' }).$extend(
  deepbook({
    address: '0x...', // User's address
    pools: { ... },   // Optional: custom pool config
    marginManagers: { ... }, // Optional: custom margin manager config
  })
);

// Access DeepBook methods via client.deepbook.*
await client.deepbook.getLevel2Range('SUI_USDC', ...);
```

### Move Abilities and PTB Limitations

When working with Move types in Programmable Transaction Blocks (PTBs):

1. **`key` ability objects (like `MarginManager`)**: Cannot be put into vectors. `tx.makeMoveVec()`
   will fail with `UnusedValueWithoutDrop` error.

2. **References cannot be returned between PTB commands**: Move functions returning `&T` or `&mut T`
   cannot have their results used in subsequent PTB commands. This causes
   `InvalidPublicFunctionReturnType` error.

3. **Workaround for batch operations**: Instead of creating vectors of `key` objects, call the
   single-object function multiple times in the same transaction and parse each `commandResults[i]`.

### Transaction Simulation and Result Parsing

For functions that return values (read-only operations), use simulation:

```typescript
const result = await client.simulateTransaction({
	transaction: tx,
	include: { commandResults: true },
});

// Access return values from simulation
const returnValues = result.commandResults?.[0]?.returnValues;
```

## Important Functions

### `getMarginManagerStates`

Fetches state for multiple margin managers in a single transaction.

**Input**: `Record<string, string>` mapping `marginManagerId -> poolKey`

**Implementation**: Calls `managerState()` for each manager in a single PTB, then parses
`commandResults[0]`, `commandResults[1]`, etc.

**Example**:

```typescript
const states = await client.deepbook.getMarginManagerStates({
	'0x206037...': 'SUI_USDC',
	'0x14218d...': 'DEEP_USDC',
});
```

### `getPriceInfoObjects` (batch)

Batch updates Pyth price feeds for multiple coins. Only updates stale feeds (older than 30 seconds).
Configured via `PRICE_INFO_OBJECT_MAX_AGE_MS` in `src/utils/config.ts`.

**Why use this over `getPriceInfoObject` in a loop?**

- Single RPC call to fetch all price info object ages (vs N calls)
- Single Pyth API call for all stale feeds (vs up to N calls)

**Input**: `(tx: Transaction, coinKeys: string[])`

**Returns**: `Record<string, string>` mapping `coinKey -> priceInfoObjectId`

**Example**:

```typescript
const priceUpdateTx = new Transaction();
const priceInfoObjects = await client.deepbook.getPriceInfoObjects(priceUpdateTx, [
	'SUI',
	'USDC',
	'DEEP',
	'WBTC',
]);
// Only stale feeds are updated in the transaction
// Fresh feeds return their existing priceInfoObjectId
```

### `getLevel2Range`

Gets order book depth for a price range. Uses vectors internally but works because the Move function
handles vector creation on-chain, not in PTB.

## SuiGrpcClient API Notes

When using the new gRPC client (replacing JSON-RPC):

| Old (JSON-RPC)                   | New (gRPC)                          |
| -------------------------------- | ----------------------------------- |
| `client.getCoins({ owner })`     | `client.listCoins({ owner })`       |
| `coins.data`                     | `coins.objects`                     |
| `coin.coinObjectId`              | `coin.objectId`                     |
| `client.getObject({ id })`       | `client.getObject({ objectId })`    |
| `result.data`                    | `{ object } = result` (destructure) |
| `signAndExecuteTransactionBlock` | `signAndExecuteTransaction`         |

## Testing

```bash
# Run tests
pnpm --filter @mysten/deepbook-v3 test

# Run codegen (requires ../deepbookv3 sibling repo)
pnpm --filter @mysten/deepbook-v3 codegen
```

## Formatting

After making changes, always run prettier to format the code:

```bash
pnpm exec prettier --write .
```

## Common Errors

1. **`UnusedValueWithoutDrop { result_idx: 0, secondary_idx: 0 }`**: Simulation returned a
   non-droppable value. Check if you're trying to create vectors of `key` objects.

2. **`InvalidPublicFunctionReturnType { idx: 0 }`**: Move function returns a reference type which
   cannot be passed between PTB commands.

3. **`INVALID_ARGUMENT`**: Often caused by using wrong property names in gRPC client calls (e.g.,
   `id` instead of `objectId`).

## Constants and Network Configuration (`src/utils/constants.ts`)

This file contains all on-chain addresses for testnet and mainnet. It is the most frequently edited
file in the package — most PRs here are adding new coins, pools, or margin pools.

### Structure

The file defines parallel testnet/mainnet maps for each entity type:

| Map                    | Type        | Key convention                            | Example key    |
| ---------------------- | ----------- | ----------------------------------------- | -------------- |
| `testnetCoins`         | `CoinMap`   | Uppercase coin symbol                     | `DEEP`, `SUI`  |
| `mainnetCoins`         | `CoinMap`   | Uppercase coin symbol                     | `USDC`, `XBTC` |
| `testnetPools`         | `PoolMap`   | `BASE_QUOTE` (uppercase)                  | `DEEP_SUI`     |
| `mainnetPools`         | `PoolMap`   | `BASE_QUOTE` (uppercase)                  | `SUI_USDC`     |
| `testnetMarginPools`   | `MarginPoolMap` | Uppercase coin symbol                 | `SUI`, `DEEP`  |
| `mainnetMarginPools`   | `MarginPoolMap` | Uppercase coin symbol                 | `SUI`, `USDC`  |
| `testnetPackageIds`    | `DeepbookPackageIds` | Fixed keys                       | —              |
| `mainnetPackageIds`    | `DeepbookPackageIds` | Fixed keys                       | —              |

### Adding a new coin

Add an entry to `mainnetCoins` (or `testnetCoins`):

```typescript
SYMBOL: {
    address: `0x...`,           // Package address
    type: `0x...::module::TYPE`, // Full coin type
    scalar: 1000000,            // 10^decimals (e.g., 1000000 for 6 decimals, 1000000000 for 9)
    feed?: '0x...',             // Pyth price feed ID (optional, needed for margin trading)
    currencyId?: '0x...',       // Pyth currency ID (optional)
    priceInfoObjectId?: '0x...', // Pyth price info object (optional)
},
```

### Adding a new pool

Add an entry to `mainnetPools` (or `testnetPools`). The `baseCoin` and `quoteCoin` must match keys
in the corresponding coins map:

```typescript
BASE_QUOTE: {
    address: `0x...`,      // Pool object ID
    baseCoin: 'BASE',      // Must match a key in mainnetCoins
    quoteCoin: 'QUOTE',    // Must match a key in mainnetCoins
},
```

### Adding a new margin pool

Add an entry to `mainnetMarginPools` (or `testnetMarginPools`). The `type` should match the coin's
`type` field from the coins map:

```typescript
SYMBOL: {
    address: '0x...',              // Margin pool object ID
    type: '0x...::module::TYPE',   // Full coin type (same as in coins map)
},
```

### Conventions

- Coin keys are always UPPERCASE symbols (e.g., `XBTC`, `USDC`, `SUIUSDE`)
- Pool keys are `BASE_QUOTE` format (e.g., `SUI_USDC`, `XBTC_USDC`)
- The `type` field in margin pools should match the corresponding coin's `type` in the coins map
- Use backtick template literals for addresses in coins/pools, single quotes in margin pools
  (follow existing style)

## Dependencies

- `@mysten/sui` - Core Sui SDK
- Requires sibling repo `../deepbookv3` for codegen

## NPM Package Change Summary Format

When asked for a summary of changes for the npm package, use this format:

```
## @mysten/deepbook-v3 Changes Summary

### New Features

**`functionName(params)`** - Brief description
- Bullet points explaining behavior
- Code example if helpful

### Configuration Changes

- `CONFIG_NAME`: oldValue → newValue (description)

### Breaking Changes

- Description of breaking change and migration path

### Bug Fixes

- Description of fix

### New Examples

- `examples/filename.ts` - Description

### Files Changed

- `path/to/file.ts` - What changed
```

---

## Changelog

Track significant updates to this file:

- **2026-02**: Initial creation with Move/PTB limitations, `getMarginManagerStates` implementation,
  gRPC client migration notes
- **2026-02**: Added `getPriceInfoObjects` batch method for efficient Pyth price updates
- **2026-02**: Updated `PRICE_INFO_OBJECT_MAX_AGE_MS` from 15s to 30s
- **2026-03**: Added constants management guide (coins, pools, margin pools)
