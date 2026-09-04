// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Argument } from './data/internal.js';

import type { ClientWithCoreApi } from '../client/index.js';
import type { TransactionDataBuilder } from './TransactionData.js';
import type { BcsType } from '@mysten/bcs';
import { Inputs } from './Inputs.js';
import { bcs } from '../bcs/index.js';
import { coreClientResolveTransactionPlugin } from '../client/core-resolver.js';
import { transactionUsesGasCoin } from './resolution-utils.js';

export interface BuildTransactionOptions {
	client?: ClientWithCoreApi;
	onlyTransactionKind?: boolean;
	/**
	 * Resolve `CoinWithBalance` intents from address balance without looking up balances or coins.
	 *
	 * If nothing else needs resolution, the transaction doesn't use `GasCoin`, and it already has a
	 * `ValidDuring` or `Validity` expiration, an unset gas payment is also set to `[]` (pay gas from
	 * address balance). Execution fails if the balances aren't there.
	 */
	assumeSufficientAddressBalances?: boolean;
}

export interface SerializeTransactionOptions extends BuildTransactionOptions {
	supportedIntents?: string[];
}

export type TransactionPlugin = (
	transactionData: TransactionDataBuilder,
	options: BuildTransactionOptions,
	next: () => Promise<void>,
) => Promise<void>;

export function needsTransactionResolution(
	data: TransactionDataBuilder,
	options: BuildTransactionOptions,
): boolean {
	if (
		data.inputs.some((input) => {
			return input.UnresolvedObject || input.UnresolvedPure;
		})
	) {
		return true;
	}

	if (!options.onlyTransactionKind) {
		if (!data.gasData.price || !data.gasData.budget) {
			return true;
		}

		if (!data.gasData.payment) {
			const assumesAddressBalanceGas =
				options.assumeSufficientAddressBalances && !transactionUsesGasCoin(data);

			// Address balance gas has no object version to protect against replay, so an offline build
			// needs a ValidDuring expiration. Epoch expiration doesn't count.
			if (
				!assumesAddressBalanceGas ||
				(data.expiration?.$kind !== 'ValidDuring' && data.expiration?.$kind !== 'Validity')
			) {
				return true;
			}
		} else if (data.gasData.payment.length === 0 && !data.expiration) {
			return true;
		}
	}

	return false;
}

export async function resolveTransactionPlugin(
	transactionData: TransactionDataBuilder,
	options: BuildTransactionOptions,
	next: () => Promise<void>,
) {
	normalizeRawArguments(transactionData);

	if (!needsTransactionResolution(transactionData, options)) {
		// Payment can only be unset here when assumeSufficientAddressBalances applies
		if (!options.onlyTransactionKind && !transactionData.gasData.payment) {
			transactionData.gasData.payment = [];
		}

		await validate(transactionData);
		return next();
	}

	const client = getClient(options);
	const plugin = client.core?.resolveTransactionPlugin() ?? coreClientResolveTransactionPlugin;

	return plugin(transactionData, options, async () => {
		await validate(transactionData);
		await next();
	});
}

function validate(transactionData: TransactionDataBuilder) {
	transactionData.inputs.forEach((input, index) => {
		if (input.$kind !== 'Object' && input.$kind !== 'Pure' && input.$kind !== 'FundsWithdrawal') {
			throw new Error(
				`Input at index ${index} has not been resolved.  Expected a Pure, Object, or FundsWithdrawal input, but found ${JSON.stringify(
					input,
				)}`,
			);
		}
	});
}

export function getClient(options: BuildTransactionOptions) {
	if (!options.client) {
		throw new Error(
			`No sui client passed to Transaction#build, but transaction data was not sufficient to build offline.`,
		);
	}

	return options.client;
}

function normalizeRawArguments(transactionData: TransactionDataBuilder) {
	for (const command of transactionData.commands) {
		switch (command.$kind) {
			case 'SplitCoins':
				command.SplitCoins.amounts.forEach((amount) => {
					normalizeRawArgument(amount, bcs.U64, transactionData);
				});
				break;
			case 'TransferObjects':
				normalizeRawArgument(command.TransferObjects.address, bcs.Address, transactionData);
				break;
		}
	}
}

function normalizeRawArgument(
	arg: Argument,
	schema: BcsType<any>,
	transactionData: TransactionDataBuilder,
) {
	if (arg.$kind !== 'Input') {
		return;
	}
	const input = transactionData.inputs[arg.Input];

	if (input.$kind !== 'UnresolvedPure') {
		return;
	}

	transactionData.inputs[arg.Input] = Inputs.Pure(schema.serialize(input.UnresolvedPure.value));
}
