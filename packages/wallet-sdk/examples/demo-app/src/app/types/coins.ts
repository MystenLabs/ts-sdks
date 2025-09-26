// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export interface CoinWithMetadata {
	coinType: string;
	totalBalance: string;
	metadata: {
		name?: string;
		symbol?: string;
		description?: string;
		decimals?: number;
	} | null;
	name: string;
	symbol: string;
}
