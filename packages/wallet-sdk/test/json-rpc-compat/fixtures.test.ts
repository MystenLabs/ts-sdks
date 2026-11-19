// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fromBase64 } from '@mysten/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import type { SuiJsonRpcTypes } from '@mysten/wallet-standard';
import { describe, expect, test } from 'vitest';

import {
	dryRunFromSimulation,
	transactionBlockResponseFromExecution,
} from '../../src/json-rpc-compat/index.js';

type MappableTransaction = Parameters<typeof dryRunFromSimulation>[0];

interface Fixture {
	bytes: string;
	signatures: string[];
	core: {
		simulateTransaction: MappableTransaction;
		getTransaction: MappableTransaction;
	};
	jsonRpc: {
		sui_dryRunTransactionBlock: Record<string, any>;
		sui_executeTransactionBlock: Record<string, any>;
	};
}

const FIXTURES_DIR = join(__dirname, 'fixtures');
const SHOW_ALL = {
	showInput: true,
	showRawInput: true,
	showEffects: true,
	showEvents: true,
	showObjectChanges: true,
	showBalanceChanges: true,
	showRawEffects: true,
};

function loadFixture(name: string): Fixture {
	return JSON.parse(readFileSync(join(FIXTURES_DIR, name), 'utf8'), (_key, value) =>
		value && typeof value === 'object' && typeof value.$bytes === 'string'
			? fromBase64(value.$bytes)
			: value,
	);
}

/** Round-trips through JSON so `undefined` fields compare like the node's omitted ones. */
function json<T>(value: T): any {
	return JSON.parse(JSON.stringify(value));
}

/**
 * Aligns the documented, deliberate differences, so everything else has to match the node:
 * error strings come from the Core API, and pure inputs the node resolved from the called
 * function's signature stay raw bytes.
 */
function alignKnownDifferences(actual: any, expected: any) {
	if (actual.effects?.status.error) {
		expect(expected.effects.status.error).toEqual(expect.any(String));
		actual.effects.status.error = expected.effects.status.error;
	}
	if ('executionErrorSource' in expected && actual.executionErrorSource) {
		actual.executionErrorSource = expected.executionErrorSource;
	}

	const actualInputs = (actual.input ?? actual.transaction?.data)?.transaction.inputs ?? [];
	const expectedInputs = (expected.input ?? expected.transaction?.data)?.transaction.inputs ?? [];
	actualInputs.forEach((input: SuiJsonRpcTypes.SuiCallArg, index: number) => {
		if (input.type === 'pure' && !('valueType' in input)) {
			expect(expectedInputs[index]).toMatchObject({ type: 'pure', valueType: expect.any(String) });
			expectedInputs[index] = input;
		}
	});
}

const fixtures = readdirSync(FIXTURES_DIR).filter((name) => name.endsWith('.json'));

describe('fullnode JSON-RPC fixtures (mainnet-v1.81.1 localnet)', () => {
	test('fixtures are present', () => {
		expect(fixtures.length).toBeGreaterThanOrEqual(7);
	});

	describe.each(fixtures)('%s', (name) => {
		const fixture = loadFixture(name);

		test('dryRunFromSimulation matches sui_dryRunTransactionBlock', () => {
			const expected = json(fixture.jsonRpc.sui_dryRunTransactionBlock);
			const actual = json(dryRunFromSimulation(fixture.core.simulateTransaction));
			alignKnownDifferences(actual, expected);

			expect(actual).toEqual(expected);
		});

		test('transactionBlockResponseFromExecution matches sui_executeTransactionBlock', () => {
			const expected = json(fixture.jsonRpc.sui_executeTransactionBlock);
			const actual = json(
				transactionBlockResponseFromExecution(
					fixture.core
						.getTransaction as SuiClientTypes.Transaction<SuiClientTypes.TransactionInclude>,
					{
						bytes: fixture.bytes,
						signatures: fixture.signatures,
						options: SHOW_ALL,
					},
				),
			);
			alignKnownDifferences(actual, expected);
			// The node reported `true` after waiting for local execution; the Core API has no
			// equivalent, so the helper always reports `false`.
			expect(expected.confirmedLocalExecution).toBe(true);
			expected.confirmedLocalExecution = false;
			// After execution the node's object lookup misses removed objects, so it dropped the
			// `deleted` and `wrapped` changes its dry run reports.
			actual.objectChanges = actual.objectChanges.filter(
				(change: SuiJsonRpcTypes.SuiObjectChange) =>
					change.type !== 'deleted' && change.type !== 'wrapped',
			);

			expect(actual).toEqual(expected);
		});
	});
});
