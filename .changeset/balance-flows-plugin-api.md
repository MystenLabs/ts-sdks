---
'@mysten/wallet-sdk': minor
---

Add a `moveCallHandlers` option to the `balanceFlows` analyzer for teaching it about protocol-specific Move calls without hard-coding package addresses into the core rule. Each entry is a factory invoked once per `analyze()` run so handlers can hold per-PTB state in a closure; the returned handler participates in the same tracking model as the built-in `0x2::coin` / `0x2::balance` framework handler — it can look up tracked balances for command arguments, emit per-address deltas, and register tracked results at result slots — but it fires only for MoveCalls the built-in handler doesn't recognize.

```ts
import { analyze, balanceFlows, createPASMoveCallHandler } from '@mysten/wallet-sdk';

await analyze(
	{ balanceFlows },
	{
		transaction,
		client,
		balanceFlows: {
			moveCallHandlers: [createPASMoveCallHandler({ packageId, namespaceId })],
		},
	},
);
```

New exports:

- `BalanceFlowsMoveCallHandler`, `BalanceFlowsMoveCallHandlerContext`, `BalanceFlowsMoveCallHandlerFactory` — the handler signature, the context passed to it (exposes `getTrackedBalance`, `keyFor`, `outputKey`, `trackCoinResult`, `trackBalanceResult`, `recordFlow`, and `addIssue`), and the factory type the `moveCallHandlers` option accepts.
- `TrackedBalance` — exported as a type so handlers can annotate values returned by `getTrackedBalance`; handlers don't construct them directly.
- `AnalyzedMoveCallCommand` — hoisted from the `AnalyzedCommand` union so handlers can type their first argument.
- `createPASMoveCallHandler({ packageId, namespaceId })` — **experimental** — a handler factory for the Permissioned Assets Standard. PAS is still evolving, so expect the supported Move signatures and the resulting delta shape to change alongside the standard. Handles `account::deposit_balance`, `account::send_balance`, `account::unlock_balance`, `account::clawback_balance`, `account::unsafe_send_balance`, `account::create`, and the `unlock_funds::resolve` / `unlock_funds::resolve_unrestricted_balance` / `clawback_funds::resolve` / `send_funds::resolve_balance` resolvers. Deltas are keyed on each PAS account's on-chain address (the shared Account object's id for existing accounts, or the `(namespace, owner)`-derived address for accounts created earlier in the same PTB via `account::create`) so they match the actual accumulator mutations on chain. The credit for `send_balance` / `unsafe_send_balance` is emitted when `send_funds::resolve_balance` runs, matching where the on-chain `balance::send_funds` call lives. Hot-potato state (pending sends, unlocked/clawed-back balances waiting on a resolver) lives in the handler's closure — the generic consume loop never sees these intermediate results, so template MoveCalls that take a `&mut Request<...>` between a send and its resolver don't wipe the pending credit. Dynamic `u64` amounts (Result args instead of Pure) are flagged as analysis issues rather than guessed — PAS withdrawals source from an account address with no tracked starting balance, so there is no safe worst-case default and the caller needs to decide how to surface the uncertainty.
