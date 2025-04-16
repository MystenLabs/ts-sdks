// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { atom } from 'nanostores';

import type { WalletWithRequiredFeatures } from '@mysten/wallet-standard';

export type CreateDAppKitStateOptions = void;

export type DAppKitState = ReturnType<typeof createState>;

export function createState(_: CreateDAppKitStateOptions) {
	const $wallets = atom<WalletWithRequiredFeatures[]>([]);
	return { $wallets };
}
