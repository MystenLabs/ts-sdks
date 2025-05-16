// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import type { IdentifierString } from '@mysten/wallet-standard';

type NonEmptyArray<T> = readonly [T, ...T[]] | readonly [...T[], T] | readonly [T, ...T[], T];

export type Networks = NonEmptyArray<Experimental_SuiClientTypes.Network>;

export function getChain(network: Experimental_SuiClientTypes.Network): IdentifierString {
	return `sui:${network}`;
}
