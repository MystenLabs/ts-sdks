// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type {
	Argument,
	BuildTransactionOptions,
	Transaction,
	TransactionDataBuilder,
	TransactionResult,
} from '@mysten/sui/transactions';
import { Inputs, TransactionCommands } from '@mysten/sui/transactions';

const SEND_FUNDS_TO_SENDER = 'WalrusSendFundsToSender';

/**
 * Sends the remaining balance of `coin` to the transaction sender's address balance.
 *
 * The sender isn't known until the transaction is built, so this adds an intent that is
 * resolved to a `0x2::coin::send_funds` call (which accepts zero balances) at build time.
 */
export function sendFundsToSender({
	coin,
	coinType,
}: {
	coin: TransactionResult;
	coinType: string;
}) {
	return (tx: Transaction) => {
		tx.addIntentResolver(SEND_FUNDS_TO_SENDER, resolveSendFundsToSender);
		tx.add(
			TransactionCommands.Intent({
				name: SEND_FUNDS_TO_SENDER,
				inputs: { coin },
				data: { coinType },
			}),
		);
	};
}

async function resolveSendFundsToSender(
	transactionData: TransactionDataBuilder,
	_buildOptions: BuildTransactionOptions,
	next: () => Promise<void>,
) {
	// Executors and wallets may prepare transactions before a sender is set. The intent is
	// left unresolved in that case, and is resolved when the transaction is built (which
	// requires a sender for the coinWithBalance intent this is always paired with anyways).
	if (!transactionData.sender) {
		return next();
	}

	for (const [index, command] of transactionData.commands.entries()) {
		if (command.$kind !== '$Intent' || command.$Intent.name !== SEND_FUNDS_TO_SENDER) {
			continue;
		}

		const { coinType } = command.$Intent.data as { coinType: string };

		transactionData.replaceCommand(
			index,
			TransactionCommands.MoveCall({
				target: '0x2::coin::send_funds',
				typeArguments: [coinType],
				arguments: [
					command.$Intent.inputs.coin as Argument,
					transactionData.addInput(
						'pure',
						Inputs.Pure(bcs.Address.serialize(transactionData.sender)),
					),
				],
			}),
		);
	}

	return next();
}
