// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

export interface LinkAssets {
	balances: {
		coinType: string;
		amount: bigint;
	}[];

	nfts: {
		objectId: string;
		type: string;
		version: string;
		digest: string;
	}[];

	coins: {
		objectId: string;
		type: string;
		version: string;
		digest: string;
	}[];
}

export function isClaimTransaction(
	tx: Transaction,
	options: {
		packageId: string;
	},
) {
	let transfers = 0;

	for (const command of tx.getData().commands) {
		switch (command.$kind) {
			case 'TransferObjects':
				// Ensure that we are only transferring results of a claim
				if (
					!command.TransferObjects.objects.every(
						(o) => o.$kind === 'Result' || o.$kind === 'NestedResult',
					)
				) {
					return false;
				}
				transfers++;
				break;
			case 'MoveCall':
				if (command.MoveCall.package !== options.packageId) {
					return false;
				}

				if (command.MoveCall.module !== 'zk_bag') {
					return false;
				}
				const fn = command.MoveCall.function;
				if (fn !== 'init_claim' && fn !== 'reclaim' && fn !== 'claim' && fn !== 'finalize') {
					return false;
				}
				break;
			default:
				return false;
		}
	}

	return transfers === 1;
}
