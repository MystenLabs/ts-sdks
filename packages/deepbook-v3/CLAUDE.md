# CLAUDE.md - DeepBook V3 Package

This file contains package-specific guidance for Claude Code when working with the deepbook-v3 package. Update this file as new information is learned.

## Overview

DeepBook V3 is a decentralized exchange (DEX) SDK for Sui blockchain. It provides client extensions for interacting with DeepBook pools, margin managers, and flash loans.

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

1. **`key` ability objects (like `MarginManager`)**: Cannot be put into vectors. `tx.makeMoveVec()` will fail with `UnusedValueWithoutDrop` error.

2. **References cannot be returned between PTB commands**: Move functions returning `&T` or `&mut T` cannot have their results used in subsequent PTB commands. This causes `InvalidPublicFunctionReturnType` error.

3. **Workaround for batch operations**: Instead of creating vectors of `key` objects, call the single-object function multiple times in the same transaction and parse each `commandResults[i]`.

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

**Implementation**: Calls `managerState()` for each manager in a single PTB, then parses `commandResults[0]`, `commandResults[1]`, etc.

**Example**:
```typescript
const states = await client.deepbook.getMarginManagerStates({
  '0x206037...': 'SUI_USDC',
  '0x14218d...': 'DEEP_USDC',
});
```

### `getLevel2Range`

Gets order book depth for a price range. Uses vectors internally but works because the Move function handles vector creation on-chain, not in PTB.

## SuiGrpcClient API Notes

When using the new gRPC client (replacing JSON-RPC):

| Old (JSON-RPC) | New (gRPC) |
|----------------|------------|
| `client.getCoins({ owner })` | `client.listCoins({ owner })` |
| `coins.data` | `coins.objects` |
| `coin.coinObjectId` | `coin.objectId` |
| `client.getObject({ id })` | `client.getObject({ objectId })` |
| `result.data` | `{ object } = result` (destructure) |
| `signAndExecuteTransactionBlock` | `signAndExecuteTransaction` |

## Testing

```bash
# Run tests
pnpm --filter @mysten/deepbook-v3 test

# Run codegen (requires ../deepbookv3 sibling repo)
pnpm --filter @mysten/deepbook-v3 codegen
```

## Common Errors

1. **`UnusedValueWithoutDrop { result_idx: 0, secondary_idx: 0 }`**: Simulation returned a non-droppable value. Check if you're trying to create vectors of `key` objects.

2. **`InvalidPublicFunctionReturnType { idx: 0 }`**: Move function returns a reference type which cannot be passed between PTB commands.

3. **`INVALID_ARGUMENT`**: Often caused by using wrong property names in gRPC client calls (e.g., `id` instead of `objectId`).

## Dependencies

- `@mysten/sui` - Core Sui SDK
- Requires sibling repo `../deepbookv3` for codegen
