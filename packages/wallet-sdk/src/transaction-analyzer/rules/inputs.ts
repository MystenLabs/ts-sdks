// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '@mysten/sui/client';
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
			object: SuiClientTypes.ObjectResponse<{ content: true }>;
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
						case 'Object':
							const objectId =
								input.Object.ImmOrOwnedObject?.objectId ??
								input.Object.Receiving?.objectId ??
								input.Object.SharedObject?.objectId!;

							const object = objectsById.get(objectId)!;
							if (!object) {
								throw new Error(`Missing object for id ${objectId}`);
							}

							return { $kind: 'Object', index, object, accessLevel: 'read' };
						default:
							throw new Error(`Unknown input type: ${JSON.stringify(input)}`);
					}
				}),
			};
		},
});
