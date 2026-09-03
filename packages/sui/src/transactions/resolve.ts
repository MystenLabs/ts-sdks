// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Argument } from './data/internal.js';

import type { ClientWithCoreApi } from '../client/index.js';
import type { TransactionDataBuilder } from './TransactionData.js';
import type { BcsType } from '@mysten/bcs';
import { Inputs } from './Inputs.js';
import { bcs } from '../bcs/index.js';
import { coreClientResolveTransactionPlugin } from '../client/core-resolver.js';
import {
	hasPotentialReplayProtection,
	setAssumedGasPayment,
	transactionUsesGasCoin,
} from './resolution-utils.js';

export interface BuildTransactionOptions {
	client?: ClientWithCoreApi;
	onlyTransactionKind?: boolean;
	/**
	 * Assume that address balances are sufficient when resolving `CoinWithBalance` intents.
	 *
	 * This resolves `CoinWithBalance` without fetching balances or coin objects. For a transaction that
	 * otherwise needs no resolution and does not use `GasCoin`, it also selects address-balance gas
	 * payment without a balance lookup. If any other transaction data needs resolution, the resolver
	 * determines the gas data normally. The transaction may fail during execution if the required
	 * address balances are not available.
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
		const assumesAddressBalanceGas =
			options.assumeSufficientAddressBalances &&
			data.gasData.payment == null &&
			!transactionUsesGasCoin(data);

		if (
			!data.gasData.price ||
			!data.gasData.budget ||
			(data.gasData.payment == null && !assumesAddressBalanceGas)
		) {
			return true;
		}

		if (
			(data.gasData.payment?.length === 0 || assumesAddressBalanceGas) &&
			!data.expiration &&
			!(options.assumeSufficientAddressBalances && hasPotentialReplayProtection(data))
		) {
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
		setAssumedGasPayment(transactionData, options);
		await validate(transactionData);
		return next();
	}

	const client = getClient(options);
	const plugin = client.core?.resolveTransactionPlugin() ?? coreClientResolveTransactionPlugin;
	const resolutionOptions = options.assumeSufficientAddressBalances
		? { ...options, assumeSufficientAddressBalances: false }
		: options;

	return await plugin(transactionData, resolutionOptions, async () => {
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
