// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Argument } from './data/internal.js';

import type { ClientWithCoreApi } from '../experimental/index.js';
import type { TransactionDataBuilder } from './TransactionData.js';
import type { BcsType } from '@mysten/bcs';
import { Inputs } from './Inputs.js';
import { bcs } from '../bcs/index.js';
import { suiClientResolveTransactionPlugin } from '../experimental/transports/json-rpc-resolver.js';
import type { SuiClient } from '../client/index.js';

export interface BuildTransactionOptions {
	client?: ClientWithCoreApi;
	onlyTransactionKind?: boolean;
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
		if (!data.gasConfig.price || !data.gasConfig.budget || !data.gasConfig.payment) {
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
		await validate(transactionData);
		return next();
	}

	const client = getClient(options);
	const plugin =
		client.core?.resolveTransactionPlugin() ??
		suiClientResolveTransactionPlugin(client as SuiClient);

	return plugin(transactionData, options, async () => {
		await validate(transactionData);
		await next();
	});
}

function validate(transactionData: TransactionDataBuilder) {
	transactionData.inputs.forEach((input, index) => {
		if (input.$kind !== 'Object' && input.$kind !== 'Pure') {
			throw new Error(
				`Input at index ${index} has not been resolved.  Expected a Pure or Object input, but found ${JSON.stringify(
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
