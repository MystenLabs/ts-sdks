// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';

import { PaymentKitCalls } from '../../src/calls.js';
import { TESTNET_PAYMENT_KIT_PACKAGE_CONFIG } from '../../src/constants.js';
import { getRegistryIdFromName } from '../../src/utils.js';

const calls = new PaymentKitCalls({ packageConfig: TESTNET_PAYMENT_KIT_PACKAGE_CONFIG });

async function toJson(call: (tx: Transaction) => void) {
	const tx = new Transaction();
	tx.add(call);
	return JSON.parse(await tx.toJSON());
}

describe('PaymentKitCalls', () => {
	it('uses package config for the createRegistry package and namespace object', async () => {
		const json = await toJson(calls.createRegistry({ registryName: 'demo' }));

		expect(json.inputs[0].UnresolvedObject.objectId).toBe(
			TESTNET_PAYMENT_KIT_PACKAGE_CONFIG.namespaceId,
		);
		expect(json.commands[0].MoveCall.package).toBe(TESTNET_PAYMENT_KIT_PACKAGE_CONFIG.packageId);
	});

	it('keeps registry and admin-cap objects explicit while using package config', async () => {
		const registryName = 'demo';
		const adminCapId = normalizeSuiAddress('0x123');
		const json = await toJson(
			calls.setConfigRegistryManagedFunds({
				registryName,
				adminCapId,
				registryManagedFunds: true,
			}),
		);

		expect(json.inputs[0].UnresolvedObject.objectId).toBe(
			getRegistryIdFromName(registryName, TESTNET_PAYMENT_KIT_PACKAGE_CONFIG.namespaceId),
		);
		expect(json.inputs[1].UnresolvedObject.objectId).toBe(adminCapId);
		expect(json.commands[0].MoveCall.package).toBe(TESTNET_PAYMENT_KIT_PACKAGE_CONFIG.packageId);
	});
});
