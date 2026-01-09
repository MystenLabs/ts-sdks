// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TransactionArgument } from '@mysten/sui/transactions';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { normalizeSuiAddress } from '@mysten/sui/utils';

import type { RuleResolvingParams } from '../../types/index.js';
import * as kiosk from '../../contracts/0x2/kiosk.js';
import * as royaltyRule from '../../contracts/kiosk/royalty_rule.js';
import * as kioskLockRule from '../../contracts/kiosk/kiosk_lock_rule.js';
import * as personalKioskRule from '../../contracts/kiosk/personal_kiosk_rule.js';
import * as floorPriceRule from '../../contracts/kiosk/floor_price_rule.js';
/**
 * A helper to resolve the royalty rule.
 */
export async function resolveRoyaltyRule(params: RuleResolvingParams) {
	const {
		transaction: tx,
		itemType,
		price,
		packageId,
		transferRequest,
		policyId,
		kioskClient,
	} = params;

	// We attempt to resolve the fee amount outside of the PTB so that the split amount is known before the transaction is sent.
	// This improves the display of the transaction within the wallet.

	const feeTx = new Transaction();

	// calculates the amount
	feeTx.add(
		royaltyRule.feeAmount({
			package: packageId,
			arguments: {
				policy: feeTx.object(policyId),
				paid: BigInt(price || '0'),
			},
			typeArguments: [itemType],
		}),
	);

	const policyObj = tx.object(policyId);

	let amount: TransactionArgument | bigint | null = null;

	try {
		feeTx.setSender(tx.getData().sender || normalizeSuiAddress('0x0'));
		const txBytes = await feeTx.build({ client: kioskClient.client });

		const result = await kioskClient.client.core.simulateTransaction({
			transaction: txBytes,
			include: { commandResults: true },
		});

		if (result.commandResults && result.commandResults.length > 0) {
			const returnedAmount = result.commandResults[0]?.returnValues?.[0]?.bcs;
			if (returnedAmount) {
				amount = BigInt(bcs.U64.parse(returnedAmount));
			}
		}
	} catch {
		// If simulate fails, fall back to resolving within the PTB
	}

	// We were not able to calculate the amount outside of the transaction, so fall back to resolving it within the PTB
	if (!amount) {
		[amount] = tx.add(
			royaltyRule.feeAmount({
				package: packageId,
				arguments: {
					policy: policyObj,
					paid: BigInt(price || '0'),
				},
				typeArguments: [itemType],
			}),
		);
	}

	// splits the coin.
	const feeCoin = tx.splitCoins(tx.gas, [amount]);

	// pays the policy
	tx.add(
		royaltyRule.pay({
			package: packageId,
			arguments: {
				policy: policyObj,
				request: transferRequest,
				payment: feeCoin,
			},
			typeArguments: [itemType],
		}),
	);
}

export function resolveKioskLockRule(params: RuleResolvingParams) {
	const {
		transaction: tx,
		packageId,
		itemType,
		kiosk: kioskId,
		kioskCap,
		policyId,
		purchasedItem,
		transferRequest,
	} = params;

	if (!kioskId || !kioskCap) throw new Error('Missing Owned Kiosk or Owned Kiosk Cap');

	tx.add(
		kiosk.lock({
			arguments: [kioskId, kioskCap, policyId, purchasedItem],
			typeArguments: [itemType],
		}),
	);

	// proves that the item is locked in the kiosk to the TP.
	tx.add(
		kioskLockRule.prove({
			package: packageId,
			arguments: {
				request: transferRequest,
				kiosk: tx.object(kioskId),
			},
			typeArguments: [itemType],
		}),
	);
}

/**
 * A helper to resolve the personalKioskRule.
 * @param params
 */
export function resolvePersonalKioskRule(params: RuleResolvingParams) {
	const { transaction: tx, packageId, itemType, kiosk, transferRequest } = params;

	if (!kiosk) throw new Error('Missing owned Kiosk.');

	// proves that the destination kiosk is personal.
	tx.add(
		personalKioskRule.prove({
			package: packageId,
			arguments: {
				kiosk: tx.object(kiosk),
				request: transferRequest,
			},
			typeArguments: [itemType],
		}),
	);
}

/**
 * A helper to resolve the floor price rule.
 * The floor price rule verifies that the paid amount meets the minimum price.
 * @param params
 */
export function resolveFloorPriceRule(params: RuleResolvingParams) {
	const { transaction: tx, packageId, itemType, policyId, transferRequest } = params;

	// proves that the paid amount meets the floor price requirement
	tx.add(
		floorPriceRule.prove({
			package: packageId,
			arguments: {
				policy: tx.object(policyId),
				request: transferRequest,
			},
			typeArguments: [itemType],
		}),
	);
}
