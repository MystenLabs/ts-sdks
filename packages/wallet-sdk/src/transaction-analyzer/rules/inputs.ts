// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import { fromBase64 } from '@mysten/sui/utils';
import type { Analyzer } from '../analyzer.js';

export type AnalyzedCommandInput =
	| {
			$kind: 'Pure';
			index: number;
			bytes: Uint8Array;
			// TODO: add parsed value and type
	  }
	| {
			$kind: 'Object';
			index: number;
			object: Experimental_SuiClientTypes.ObjectResponse;
	  };

export const inputAnalyzer: Analyzer<AnalyzedCommandInput[]> =
	() =>
	async ({ getAll }) => {
		const [data, objects] = await getAll('data', 'objectsById');

		return data.inputs.map((input, index): AnalyzedCommandInput => {
			switch (input.$kind) {
				case 'Pure':
					return { $kind: 'Pure', index, bytes: fromBase64(input.Pure.bytes!) };
				case 'Object':
					const objectId =
						input.Object.ImmOrOwnedObject?.objectId ??
						input.Object.Receiving?.objectId ??
						input.Object.SharedObject?.objectId!;

					const object = objects.get(objectId)!;
					if (!object) {
						throw new Error(`Missing object for id ${objectId}`);
					}

					return { $kind: 'Object', index, object };
				default:
					throw new Error(`Unknown input type: ${JSON.stringify(input)}`);
			}
		});
	};
