// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Argument, Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';
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
	let starts = 0;
	let finalizations = 0;
	const claimResults = new Set<number>();
	const isClaimedObject = (argument: Argument) =>
		argument.$kind === 'Result'
			? claimResults.has(argument.Result)
			: argument.$kind === 'NestedResult' &&
				argument.NestedResult[1] === 0 &&
				claimResults.has(argument.NestedResult[0]);

	for (const [index, command] of tx.getData().commands.entries()) {
		switch (command.$kind) {
			case 'TransferObjects':
				// Ensure that we are only transferring results of a claim
				if (!command.TransferObjects.objects.every(isClaimedObject)) {
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
						!coin ||
						!isClaimedObject(coin) ||
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
				switch (command.MoveCall.function) {
					case 'init_claim':
					case 'reclaim':
						if (++starts !== 1) return false;
						break;
					case 'claim':
						if (starts !== 1 || finalizations !== 0) return false;
						claimResults.add(index);
						break;
					case 'finalize':
						if (claimResults.size === 0 || ++finalizations !== 1) return false;
						break;
					default:
						return false;
				}
				break;
			default:
				return false;
		}
	}

	return (
		starts === 1 &&
		finalizations === 1 &&
		claimResults.size > 0 &&
		(transfers === 1 || (transfers === 0 && deposits > 0))
	);
}
