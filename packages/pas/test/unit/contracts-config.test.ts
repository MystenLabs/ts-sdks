// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import { create } from '../../src/contracts/pas/account.js';
import type { PASPackageConfig } from '../../src/types.js';

describe('generated PAS contract config', () => {
	const packageConfig = {
		packageId: '0x123',
		namespaceId: '0xabc',
	} satisfies PASPackageConfig;

	it('fills package and namespace arguments from PASPackageConfig', () => {
		const tx = new Transaction();

		tx.add(
			create({
				arguments: {
					owner: '0x456',
				},
				config: packageConfig,
			}),
		);

		const data = tx.getData() as {
			inputs: { $kind: string; UnresolvedObject?: { objectId: string } }[];
			commands: {
				MoveCall?: {
					package: string;
					module: string;
					function: string;
					arguments: unknown[];
				};
			}[];
		};

		expect(data.commands[0]?.MoveCall).toMatchObject({
			package: '0x0000000000000000000000000000000000000000000000000000000000000123',
			module: 'account',
			function: 'create',
		});
		expect(data.commands[0]?.MoveCall?.arguments).toHaveLength(2);
		expect(data.inputs[0]).toEqual({
			$kind: 'UnresolvedObject',
			UnresolvedObject: {
				objectId: '0x0000000000000000000000000000000000000000000000000000000000000abc',
			},
		});
	});
});
