// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '@mysten/sui/client';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';

import { Field } from '../../src/contracts/sui/dynamic_field.js';
import { TypeName } from '../../src/contracts/pas/deps/std/type_name.js';
import { Command, MoveCall } from '../../src/contracts/ptb/ptb.js';
import { InvalidObjectOwnershipError } from '../../src/error.js';
import { validateTemplateObjects } from '../../src/intents.js';
import { getClient, setupToolbox } from './setup.ts';

type SuiObject = SuiClientTypes.Object<{ content: true }>;

/**
 * Builds a fake template DF object whose command references the given
 * object IDs via `object_by_id` extensions. No on-chain publish needed.
 */
function buildFakeTemplate(objectIds: string[]): SuiObject {
	const args = objectIds.map((id) => ({
		Input: {
			Object: { Ext: `object_by_id:${normalizeSuiAddress(id)}` },
		},
	}));

	const moveCallBytes = MoveCall.serialize({
		package_id: normalizeSuiAddress('0x1'),
		module_name: 'fake',
		function: 'fake',
		arguments: args as any,
		type_arguments: [],
	}).toBytes();

	const FieldType = Field(TypeName, Command);
	const content = FieldType.serialize({
		id: normalizeSuiAddress('0x0'),
		name: { name: 'fake::FakeApproval' },
		value: [0, [...moveCallBytes]] as any,
	}).toBytes();

	return {
		objectId: normalizeSuiAddress('0x0'),
		version: '0',
		digest: '',
		owner: { $kind: 'Shared', Shared: { initialSharedVersion: '0' } },
		type: '',
		content,
		previousTransaction: undefined,
		objectBcs: undefined,
		json: undefined,
	} as unknown as SuiObject;
}

describe('template object ownership validation', () => {
	it('rejects templates referencing address-owned objects', async () => {
		const toolbox = await setupToolbox();
		const client = getClient();

		const { objects: coins } = await client.listCoins({ owner: toolbox.address() });
		expect(coins.length).toBeGreaterThan(0);
		const ownedObjectId = coins[0].objectId;

		const template = buildFakeTemplate([ownedObjectId]);

		await expect(validateTemplateObjects(client, [template])).rejects.toThrow(
			InvalidObjectOwnershipError,
		);
	});

	it('accepts templates referencing shared and immutable objects', async () => {
		const toolbox = await setupToolbox();
		const client = getClient();
		const namespaceId = toolbox.client.pas.getPackageConfig().namespaceId;
		// 0x2 is the Sui framework package -- always immutable.
		const suiFrameworkId = normalizeSuiAddress('0x2');

		const template = buildFakeTemplate([namespaceId, suiFrameworkId]);

		await expect(validateTemplateObjects(client, [template])).resolves.not.toThrow();
	});
});
