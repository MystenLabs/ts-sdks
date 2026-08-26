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
		expect(d.deployment).toBe('predict-testnet-8-21');
		expect(d.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
	});

	test('the account registry exists and belongs to the recorded account package', async () => {
		const cfg = getAccountConfig('testnet');
		expect(await typeOf(cfg.accountRegistry)).toBe(
			`${cfg.accountPackageId}::account_registry::AccountRegistry`,
		);
	});

	test('the SessionsConfig exists and belongs to the recorded sessions package', async () => {
		// This is the check that distinguishes the live sessions package from the retired one:
		// both remain authorized on the registry, but only one owns this config object.
		const cfg = getSessionsConfig('testnet');
		expect(await typeOf(cfg.sessionsConfig)).toBe(
			`${cfg.sessionsPackageId}::session_config::SessionsConfig`,
		);
	});

	test('the sessions app is authorized on the recorded account registry', async () => {
		// Note this does NOT discriminate the live package from the retired one — both are
		// still authorized on the registry. The SessionsConfig-type check above is what does.
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
		expect(apps.some((t) => t.includes(`${cfg.sessionsPackageId}::sessions::SessionsApp`))).toBe(
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
			registry: `${packages.predict}::registry::Registry`,
			protocolConfig: `${packages.predict}::protocol_config::ProtocolConfig`,
			poolVault: `${packages.predict}::plp::PoolVault`,
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
