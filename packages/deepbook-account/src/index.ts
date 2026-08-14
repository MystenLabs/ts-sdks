// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Public API for `@mysten/deepbook-account` — the shared on-chain account primitive
// (`packages/account`) that DeepBook's core account wrapper and DeepBook Predict both
// build on. The curated surface is the `AccountContract` transaction builders plus the
// generated BCS structs consumers need to parse account state and receipts.

// === Transaction builders ===
export { AccountContract, ACCUMULATOR_ROOT_ID } from './account.js';
export type { AccountConfig } from './account.js';

// === Generated bindings ===
// The move-call thunks and BCS structs, for consumers composing their own PTBs or
// parsing account objects/events (e.g. `AccountWrapper.parse`, the event layouts).
export * as accountMoveCalls from './contracts/account/account.js';
export * as accountRegistryMoveCalls from './contracts/account/account_registry.js';
export * as accountEvents from './contracts/account/account_events.js';
export { Account, AccountWrapper } from './contracts/account/account.js';
