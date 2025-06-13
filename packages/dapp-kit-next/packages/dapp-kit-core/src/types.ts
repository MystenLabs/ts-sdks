// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKit } from './core/index.js';

export interface Register {}

export type ResolvedRegister = {
	dAppKit: Register extends { dAppKit: infer _DAppKit extends DAppKit } ? _DAppKit : DAppKit;
};

export type RegisteredDAppKit = ResolvedRegister['dAppKit'];
