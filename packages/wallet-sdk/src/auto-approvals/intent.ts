// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { TransactionDataBuilder } from '@mysten/sui/transactions';
import { TransactionCommands } from '@mysten/sui/transactions';

export const OPERATION_INTENT = '@mysten/wallet-kit/AutoApprovalOperation';

export function operationType(operationType: string) {
	return (tx: Transaction): TransactionResult => {
		tx.addIntentResolver(OPERATION_INTENT, (transactionData, _options, next) => {
			replaceOperationTypeIntent(transactionData);
			return next();
		});

		const result = tx.add(
			TransactionCommands.Intent({
				name: OPERATION_INTENT,
				inputs: {},
				data: { operationType },
			}),
		);

		return result;
	};
}

export function extractOperationType(cb: (operationType: string) => void) {
	return (
		transactionData: TransactionDataBuilder,
		_options: unknown,
		next: () => Promise<void>,
	) => {
		replaceOperationTypeIntent(transactionData, cb);
		return next();
	};
}

function replaceOperationTypeIntent(
	transactionData: TransactionDataBuilder,
	cb?: (operationType: string) => void,
) {
	let intentFound = false;
	for (let index = 0; index < transactionData.commands.length; index++) {
		const command = transactionData.commands[index];
		if (command.$kind === '$Intent' && command.$Intent.name === OPERATION_INTENT) {
			if (intentFound) {
				throw new Error('Multiple operation type intents found in transaction');
			}
			intentFound = true;
			const operationType = command.$Intent.data.operationType as string;
			transactionData.replaceCommand(index, []);
			cb?.(operationType);
		}
	}
}
