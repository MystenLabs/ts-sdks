// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Live-testnet check that the generated deployment record still describes reality.
// Network-gated: runs only under `pnpm test:e2e` (PREDICT_SDK_TESTNET=1).
//
// The offline tests can only prove the record is internally consistent. This one proves
// the ids still exist on chain and still have the types the SDK assumes — which is the
// failure a redeploy actually produces: a record that compiles, passes every offline
// test, and addresses a package that no longer exists or has been retired.
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { describe, expect, test } from 'vitest';

import { getAccountConfig } from '../../../src/account.js';
import { getDeployment, TESTNET_PREDICT } from '../../../src/deployments/index.js';
import { getSessionsConfig } from '../../../src/sessions.js';

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
});

async function typeOf(objectId: string): Promise<string> {
	const { object } = await client.core.getObject({ objectId });
	return String(object?.type ?? '');
}

describe('the deployment record matches the live chain', () => {
	test('it names the deployment and commit it was generated from', () => {
		const d = getDeployment('testnet');
		expect(d.deployment).toBe('deepbook-predict-testnet');
		expect(d.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
	});

	test('the account registry exists and belongs to the recorded account package', async () => {
		const cfg = getAccountConfig('testnet');
		expect(await typeOf(cfg.accountRegistry)).toBe(
			`${cfg.accountPackageId}::account_registry::AccountRegistry`,
		);
	});

	test('the SessionsConfig exists and belongs to the recorded sessions package', async () => {
		// Existing SessionsConfig types retain their v1 origin after a compatible upgrade.
		const cfg = getSessionsConfig('testnet');
		expect(await typeOf(cfg.sessionsConfig)).toBe(
			`${cfg.sessionsPackageIdV1}::session_config::SessionsConfig`,
		);
	});

	test('the sessions app is authorized on the recorded account registry', async () => {
		// App authorization is keyed by the original SessionsApp type, not the call target.
		const cfg = getSessionsConfig('testnet');
		// Page: the AppKey entries sort last, and every new account adds two `Claimed` entries
		// ahead of them, so a fixed limit starts missing them as the registry grows.
		const apps: string[] = [];
		let cursor: string | undefined;
		do {
			const page = await client.core.listDynamicFields({
				parentId: cfg.accountRegistry,
				limit: 50,
				cursor,
			});
			apps.push(...page.dynamicFields.map((f) => String(f.name?.type ?? '')));
			cursor = page.hasNextPage ? page.cursor : undefined;
		} while (cursor);
		expect(apps.some((t) => t.includes(`${cfg.sessionsPackageIdV1}::sessions::SessionsApp`))).toBe(
			true,
		);
	});

	// Existence is not enough, and asserting it was the bug: a RETIRED deployment's objects
	// all still exist on chain, so `typeOf(id) !== ''` passed with the record pointing at the
	// wrong package — which is precisely the failure a stale regeneration produces. Tie each
	// object to the package id the record itself ships.
	test('every Predict object is owned by the recorded package', async () => {
		const { packages, objects } = TESTNET_PREDICT;
		const expected: Record<string, string> = {
			registry: `${packages.predictV1}::registry::Registry`,
			protocolConfig: `${packages.predictV1}::protocol_config::ProtocolConfig`,
			poolVault: `${packages.predictV1}::plp::PoolVault`,
			oracleRegistry: `${packages.propbook}::registry::OracleRegistry`,
			accountRegistry: `${packages.account}::account_registry::AccountRegistry`,
		};
		// Every object must be covered, so adding one to the record fails here until it is.
		expect(Object.keys(expected).sort()).toEqual(Object.keys(objects).sort());
		const actual = Object.fromEntries(
			await Promise.all(
				Object.entries(objects).map(async ([name, id]) => [name, await typeOf(id)] as const),
			),
		);
		expect(actual).toEqual(expected);
	});

	test('the oracle feeds belong to the recorded propbook package', async () => {
		const { packages, underlyings } = TESTNET_PREDICT;
		for (const u of Object.values(underlyings)) {
			for (const id of [u.pythFeed, u.blockScholesValueStore, u.blockScholesSviStore]) {
				expect(await typeOf(id)).toMatch(new RegExp(`^${packages.propbook}::`));
			}
		}
	});
});

describe('v2 package publication and type origins', () => {
	test.each([
		[TESTNET_PREDICT.packages.predict, TESTNET_PREDICT.packages.predictV1],
		[
			getSessionsConfig('testnet').sessionsPackageId,
			getSessionsConfig('testnet').sessionsPackageIdV1,
		],
	])('latest package %s is version 2 of %s', async (packageId, originalId) => {
		const { response } = await client.movePackageService.getPackage({ packageId });
		expect(response.package?.version).toBe(2n);
		expect(response.package?.originalId).toBe(originalId);
	});
	test.each([
		[
			TESTNET_PREDICT.packages.predict,
			'expiry_market',
			'MintQuote',
			TESTNET_PREDICT.packages.predictV1,
		],
		[
			TESTNET_PREDICT.packages.predict,
			'predict_account',
			'PredictApp',
			TESTNET_PREDICT.packages.predictV1,
		],
		[
			TESTNET_PREDICT.packages.predict,
			'order_events',
			'OrderMinted',
			TESTNET_PREDICT.packages.predictV1,
		],
		[
			TESTNET_PREDICT.packages.predict,
			'strike_exposure',
			'MintRange',
			TESTNET_PREDICT.packages.predict,
		],
		[
			getSessionsConfig('testnet').sessionsPackageId,
			'sessions',
			'SessionsApp',
			getSessionsConfig('testnet').sessionsPackageIdV1,
		],
	])(
		'%s::%s::%s retains its introducing package',
		async (packageId, moduleName, name, definingId) => {
			const { response } = await client.movePackageService.getDatatype({
				packageId,
				moduleName,
				name,
			});
			expect(response.datatype?.definingId).toBe(definingId);
		},
	);
	test.each([
		[TESTNET_PREDICT.packages.predict, 'expiry_market', 'mint_exact_cost', 12],
		[TESTNET_PREDICT.packages.predict, 'expiry_market', 'quote_mint_exact_cost_for_account', 11],
		[getSessionsConfig('testnet').sessionsPackageId, 'sessions', 'mint_exact_cost', 13],
	])(
		'%s::%s::%s is published with the v2 signature',
		async (packageId, moduleName, name, parameters) => {
			const { response } = await client.movePackageService.getFunction({
				packageId,
				moduleName,
				name,
			});
			expect(response.function?.parameters).toHaveLength(parameters); // includes automatic TxContext
		},
	);
});

test.each([
	[TESTNET_PREDICT.packages.predictV1, 'expiry_market'],
	[getSessionsConfig('testnet').sessionsPackageIdV1!, 'sessions'],
])('v1 %s still exists but does not expose the new budget mint', async (packageId, moduleName) => {
	const { response } = await client.movePackageService.getPackage({ packageId });
	expect(response.package?.version).toBe(1n);
	const functions = response.package?.modules
		.find((module) => module.name === moduleName)
		?.functions.map((fn) => fn.name);
	expect(functions).toContain('mint_exact_quantity');
	expect(functions).not.toContain('mint_exact_cost');
	expect(functions).not.toContain('quote_mint_exact_cost_for_account');
});
