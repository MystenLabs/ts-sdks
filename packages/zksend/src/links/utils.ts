// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';

/** A claimed asset paired with its on-chain type, available for composition within a claim transaction. */
export interface ClaimedAsset {
	/** Transaction argument representing the claimed object — pass to moveCall or transferObjects. */
	argument: TransactionObjectArgument;
	/** Full Move type of the object (e.g. "0x...::record::Record"). */
	type: string;
	/** Object ID of the asset in the link's bag. */
	objectId: string;
}

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
	let deposits = 0;

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
				if (
					command.MoveCall.package === normalizeSuiAddress('0x2') &&
					command.MoveCall.module === 'coin' &&
					command.MoveCall.function === 'send_funds'
				) {
					const [coin, recipient] = command.MoveCall.arguments;
					if (
						command.MoveCall.arguments.length !== 2 ||
						command.MoveCall.typeArguments.length !== 1 ||
						(coin?.$kind !== 'Result' && coin?.$kind !== 'NestedResult') ||
						recipient?.$kind !== 'Input'
					) {
						return false;
					}
					deposits++;
					break;
				}
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

	return transfers <= 1 && (transfers === 1 || deposits > 0);
}
