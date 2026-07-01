# `@mysten/deepbook-predict`

TypeScript SDK for the DeepBook **Predict** protocol — on-chain European cash-settled range digitals
on Sui.

> **Status: pre-launch, unstable.** Predict is not yet deployed to any network and its on-chain
> interface is still changing. There are no published package addresses; construct `PredictConfig`
> with explicit `packageIds` overrides. The API here will change without notice until the protocol
> ships to testnet.

## Layout

- `src/contracts/**` — generated Move bindings (`@mysten/codegen`), used as the BCS-schema source.
  Regenerate with `pnpm codegen`.
- `src/transactions/**` — hand-written transaction builders (trader, LP, ...).
- `src/queries/**` — on-chain (`devInspect`) reads plus optional predict-server indexer helpers.
- `src/types/orderId.ts` — codec for the packed-`u256` order ID (mirrors `deepbook_predict::order`;
  the Move module exposes no public accessors).
- `src/utils/{config,constants}.ts` — `PredictConfig` and protocol constants.

## Codegen

`pnpm codegen` runs `sui move summary` for each configured Move package (from the sibling
`deepbookv3` checkout) and regenerates `src/contracts/**`. Requires the Sui CLI (`>= 1.51.1`) and
the `deepbookv3` repo checked out alongside `ts-sdks`.

## Scope (v1)

Trader and LP flows; oracle **read-only**; slippage-guard-based trading (no off-chain quote
previewer). Keeper/admin/market-lifecycle and oracle publishing are deferred to later milestones.
