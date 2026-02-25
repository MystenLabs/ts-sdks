// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64, toBase64 } from '@mysten/sui/utils';

export type SigningRequestType =
	| 'sign-personal-message'
	| 'sign-transaction'
	| 'sign-and-execute-transaction';

export interface ExecuteSigningOptions {
	type: SigningRequestType;
	signer: Signer;
	data: unknown;
	client?: ClientWithCoreApi;
}

/**
 * Execute a signing request (sign message, sign transaction, or sign & execute).
 * Shared between the embedded wallet (DevWallet) and the standalone popup (request-handler).
 */
export async function executeSigning({ type, signer, data, client }: ExecuteSigningOptions) {
	switch (type) {
		case 'sign-personal-message': {
			if (!(data instanceof Uint8Array)) {
				throw new Error('sign-personal-message expects data to be a Uint8Array');
			}
			const { bytes, signature } = await signer.signPersonalMessage(data);
			return { type, bytes, signature };
		}
		case 'sign-transaction': {
			if (!client) throw new Error('No client provided for sign-transaction');
			if (typeof data !== 'string') {
				throw new Error('sign-transaction expects data to be a JSON string');
			}
			const tx = Transaction.from(data);
			const { bytes, signature } = await tx.sign({ client, signer });
			return { type, bytes, signature };
		}
		case 'sign-and-execute-transaction': {
			if (!client) throw new Error('No client provided for sign-and-execute-transaction');
			if (typeof data !== 'string') {
				throw new Error('sign-and-execute-transaction expects data to be a JSON string');
			}
			const tx = Transaction.from(data);
			const { bytes, signature } = await tx.sign({ client, signer });
			const result = await client.core.executeTransaction({
				transaction: fromBase64(bytes),
				signatures: [signature],
				include: { effects: true },
			});
			const txResult = result.Transaction ?? result.FailedTransaction;
			if (!txResult) {
				throw new Error('Transaction execution returned empty result');
			}
			if (!txResult.status.success) {
				throw new Error(txResult.status.error?.message ?? 'Transaction execution failed');
			}
			return {
				type,
				bytes,
				signature,
				digest: txResult.digest,
				effects: txResult.effects?.bcs ? toBase64(txResult.effects.bcs) : undefined,
			};
		}
	}
}
