// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '@mysten/sui/client';
import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui/utils';
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
			withdrawFrom: 'Sender' | 'Sponsor' | 'SenderAllowance';
			/** The address whose balance is debited when `withdrawFrom` is `SenderAllowance`. */
			funder?: string;
			/** The allowance object authorizing the withdrawal when `withdrawFrom` is `SenderAllowance`. */
			allowance?: string;
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
							let objectId: string;
							switch (input.Object.$kind) {
								case 'ImmOrOwnedObject':
									objectId = input.Object.ImmOrOwnedObject.objectId;
									break;
								case 'SharedObject':
									objectId = input.Object.SharedObject.objectId;
									break;
								case 'Receiving':
									objectId = input.Object.Receiving.objectId;
									break;
								default:
									throw new Error(`Unknown object input kind: ${JSON.stringify(input)}`);
							}

							const object = objectsById.get(objectId);
							if (!object) {
								throw new Error(`Missing object for id ${objectId}`);
							}

							return { $kind: 'Object', index, object, accessLevel: 'read' };
						}
						case 'FundsWithdrawal': {
							const { reservation, typeArg, withdrawFrom } = input.FundsWithdrawal;
							if (reservation.$kind !== 'MaxAmountU64') {
								throw new Error(`Unsupported reservation type: ${reservation.$kind}`);
							}
							let coinType: string;
							switch (typeArg.$kind) {
								case 'Balance':
									coinType = normalizeStructTag(typeArg.Balance);
									break;
								default:
									throw new Error(
										`Unsupported FundsWithdrawal typeArg: ${JSON.stringify(typeArg)}`,
									);
							}
							switch (withdrawFrom.$kind) {
								case 'Sender':
								case 'Sponsor':
									return {
										$kind: 'Withdrawal',
										index,
										amount: BigInt(reservation.MaxAmountU64),
										coinType,
										withdrawFrom: withdrawFrom.$kind,
										accessLevel: 'transfer',
									};
								case 'SenderAllowance':
									return {
										$kind: 'Withdrawal',
										index,
										amount: BigInt(reservation.MaxAmountU64),
										coinType,
										withdrawFrom: 'SenderAllowance',
										funder: normalizeSuiAddress(withdrawFrom.SenderAllowance.funder),
										allowance: normalizeSuiAddress(withdrawFrom.SenderAllowance.allowance),
										accessLevel: 'transfer',
									};
								default:
									throw new Error(
										`Unsupported FundsWithdrawal source: ${JSON.stringify(withdrawFrom)}`,
									);
							}
						}
						default:
							throw new Error(`Unknown input type: ${JSON.stringify(input)}`);
					}
				}),
			};
		},
});
