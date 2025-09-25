// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import type { Analyzer } from '../analyzer.js';

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
			object: Experimental_SuiClientTypes.ObjectResponse;
			accessLevel: 'read' | 'mutate' | 'transfer';
	  };

export const inputAnalyzer: Analyzer<AnalyzedCommandInput[]> =
	() =>
	async ({ getAll }) => {
		const [data, objects] = await getAll('data', 'objectsById');

		return data.inputs.map((input, index): AnalyzedCommandInput => {
			switch (input.$kind) {
				case 'Pure':
					return { $kind: 'Pure', index, bytes: input.Pure.bytes!, accessLevel: 'transfer' };
				case 'Object':
					const objectId =
						input.Object.ImmOrOwnedObject?.objectId ??
						input.Object.Receiving?.objectId ??
						input.Object.SharedObject?.objectId!;

					const object = objects.get(objectId)!;
					if (!object) {
						throw new Error(`Missing object for id ${objectId}`);
					}

					return { $kind: 'Object', index, object, accessLevel: 'read' };
				default:
					throw new Error(`Unknown input type: ${JSON.stringify(input)}`);
			}
		});
	};
