// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '@mysten/sui/client';
import { normalizeStructTag } from '@mysten/sui/utils';
import { createAnalyzer } from '../analyzer.js';
import { data } from './core.js';
import { objectsById } from './objects.js';

export type AnalyzedCommandInput =
	| {
			$kind: 'Pure';
			index: number;
			bytes: string; // base64 encoded
			// TODO: add parsed value and type
			accessLevel: 'read' | 'mutate' | 'transfer';
	  }
	| {
			$kind: 'Object';
			index: number;
			object: SuiClientTypes.Object<{ content: true }>;
			accessLevel: 'read' | 'mutate' | 'transfer';
	  }
	| {
			$kind: 'Withdrawal';
			index: number;
			amount: bigint;
			coinType: string;
			withdrawFrom: 'Sender' | 'Sponsor';
			accessLevel: 'read' | 'mutate' | 'transfer';
	  };

export const inputs = createAnalyzer({
	dependencies: { data, objectsById },
	analyze:
		() =>
		({ data, objectsById }) => {
			return {
				result: data.inputs.map((input, index): AnalyzedCommandInput => {
					switch (input.$kind) {
						case 'Pure':
							return { $kind: 'Pure', index, bytes: input.Pure.bytes!, accessLevel: 'transfer' };
						case 'Object': {
							const objectId =
								input.Object.ImmOrOwnedObject?.objectId ??
								input.Object.Receiving?.objectId ??
								input.Object.SharedObject?.objectId!;

							const object = objectsById.get(objectId)!;
							if (!object) {
								throw new Error(`Missing object for id ${objectId}`);
							}

							return { $kind: 'Object', index, object, accessLevel: 'read' };
						}
						case 'FundsWithdrawal': {
							const reservation = input.FundsWithdrawal.reservation;
							if (reservation.$kind !== 'MaxAmountU64') {
								throw new Error(`Unsupported reservation type: ${reservation.$kind}`);
							}
							return {
								$kind: 'Withdrawal',
								index,
								amount: BigInt(reservation.MaxAmountU64),
								coinType: normalizeStructTag(input.FundsWithdrawal.typeArg.Balance),
								withdrawFrom: input.FundsWithdrawal.withdrawFrom.$kind,
								accessLevel: 'transfer',
							};
						}
						default:
							throw new Error(`Unknown input type: ${JSON.stringify(input)}`);
					}
				}),
			};
		},
});
