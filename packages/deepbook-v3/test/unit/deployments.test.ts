// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, test } from 'vitest';

import { getAccountConfig } from '../../src/account.js';
import { testnetPackageIds } from '../../src/utils/constants.js';
import { getSessionsConfig, SessionsContract } from '../../src/sessions.js';
import {
	getDeployment,
	getUnits,
	TESTNET_ACCOUNT,
	TESTNET_DEPLOYMENT,
	TESTNET_PREDICT,
	TESTNET_SESSIONS,
} from '../../src/deployments/index.js';

const ADDRESS = /^0x[0-9a-f]{64}$/;

describe('the generated deployment record is well formed', () => {
	test('every id is a full 32-byte address', () => {
		const ids = [
			...Object.values(TESTNET_ACCOUNT),
			...Object.values(TESTNET_SESSIONS),
			...Object.values(TESTNET_PREDICT.packages),
			...Object.values(TESTNET_PREDICT.objects),
		];
		expect(ids.length).toBeGreaterThan(0);
		for (const id of ids) expect(id).toMatch(ADDRESS);
	});

	// `underlyings` is generated per entry rather than from a fixed key list, so it is the
	// part that can grow. An id here that came through as the string 'undefined' would once
	// have compiled and passed everything else.
	test('every underlying carries real feed ids and a numeric propbook id', () => {
		const entries = Object.entries(TESTNET_PREDICT.underlyings);
		expect(entries.length).toBeGreaterThan(0);
		for (const [symbol, u] of entries) {
			expect(u.symbol).toBe(symbol);
			expect(typeof u.propbookUnderlyingId).toBe('number');
			expect(u.pythFeed).toMatch(ADDRESS);
			expect(u.blockScholesValueStore).toMatch(ADDRESS);
			expect(u.blockScholesSviStore).toMatch(ADDRESS);
		}
	});

	test('no field anywhere in the record is the string "undefined"', () => {
		const walk = (v: unknown): string[] =>
			typeof v === 'string'
				? [v]
				: typeof v === 'object' && v !== null
					? Object.values(v).flatMap(walk)
					: [];
		const all = [TESTNET_ACCOUNT, TESTNET_SESSIONS, TESTNET_PREDICT, TESTNET_DEPLOYMENT].flatMap(
			walk,
		);
		expect(all.filter((x) => x.includes('undefined') || x.includes('[object'))).toEqual([]);
	});

	test('coin types are fully qualified, and PLP is not assumed to equal the package id', () => {
		// A Move type tag keeps the ORIGINAL package id across an upgrade while
		// `packages.predict` moves on, so PLP must be shipped, not derived.
		for (const t of Object.values(TESTNET_PREDICT.coinTypes)) {
			expect(t).toMatch(/^0x[0-9a-f]{64}::\w+::\w+$/);
		}
		expect(TESTNET_PREDICT.quoteCoinType).toMatch(/^0x[0-9a-f]{64}::\w+::\w+$/);
	});

	test('scale constants come from the deploy, not from literals', () => {
		// Equality, not `> 0`: a lot size of 1_000_000 passed the whole suite while
		// `#assertLot` rejected every legal order below a $1 payout, before any chain contact.
		expect(TESTNET_PREDICT.units.positionLotSize).toBe(10_000);
		expect(TESTNET_PREDICT.units.fixedPointScale).toBe(1_000_000_000);
		expect(TESTNET_PREDICT.units.quoteCoinDecimals).toBe(6);
	});

	test('it records which deployment it came from', () => {
		expect(TESTNET_DEPLOYMENT.deployment).toBeTruthy();
		expect(TESTNET_DEPLOYMENT.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
		expect(TESTNET_DEPLOYMENT.network).toBe('testnet');
	});
});

describe('slices cannot disagree about the ids they share', () => {
	// This is the drift the record exists to prevent: three subpaths addressing the same
	// `account` package. A partial regeneration or a hand-edit breaks exactly here.
	test('accountPackageId is identical across account, sessions and predict', () => {
		expect(TESTNET_SESSIONS.accountPackageId).toBe(TESTNET_ACCOUNT.accountPackageId);
		expect(TESTNET_PREDICT.packages.account).toBe(TESTNET_ACCOUNT.accountPackageId);
	});

	test('accountRegistry is identical across account, sessions and predict', () => {
		expect(TESTNET_SESSIONS.accountRegistry).toBe(TESTNET_ACCOUNT.accountRegistry);
		expect(TESTNET_PREDICT.objects.accountRegistry).toBe(TESTNET_ACCOUNT.accountRegistry);
	});
});

describe('per-network accessors', () => {
	test('getAccountConfig returns the account slice on testnet', () => {
		expect(getAccountConfig('testnet')).toEqual({ ...TESTNET_ACCOUNT });
	});

	test('an unrecorded network throws rather than returning placeholder ids', () => {
		expect(() => getAccountConfig('mainnet')).toThrow(/no account deployment recorded/);
		expect(() => getDeployment('mainnet')).toThrow(/no deployment recorded for network 'mainnet'/);
	});

	test('the returned config is frozen, so one caller cannot poison another', () => {
		// These are shared module singletons. Returning them unfrozen meant a caller who
		// customised a deployment in place changed what every other caller saw — including
		// across subpaths, since they read one record.
		const cfg = getAccountConfig('testnet');
		expect(Object.isFrozen(cfg)).toBe(true);
		expect(() => {
			(cfg as { accountRegistry: string }).accountRegistry = '0x' + '00'.repeat(32);
		}).toThrow(TypeError);
		expect(getAccountConfig('testnet').accountRegistry).toBe(TESTNET_ACCOUNT.accountRegistry);
	});

	test('nested records are frozen too, not just the top level', () => {
		for (const nested of [
			TESTNET_PREDICT.packages,
			TESTNET_PREDICT.objects,
			TESTNET_PREDICT.coinTypes,
			TESTNET_PREDICT.units,
			TESTNET_PREDICT.underlyings,
			...Object.values(TESTNET_PREDICT.underlyings),
		]) {
			expect(Object.isFrozen(nested)).toBe(true);
		}
	});

	test('spreading to customise still works on a frozen record', () => {
		const custom = { ...getAccountConfig('testnet'), accountRegistry: '0x' + '11'.repeat(32) };
		expect(custom.accountRegistry).toBe('0x' + '11'.repeat(32));
		expect(getAccountConfig('testnet').accountRegistry).toBe(TESTNET_ACCOUNT.accountRegistry);
	});
});

describe('the record agrees with the package root about shared objects', () => {
	// DeepBook's `Registry` is authored twice on different cadences: the root's spot/margin
	// constants track DeepBook core's own releases, while the sessions slice comes from the
	// Predict deploy manifest. They address the same object, so they must not diverge — if
	// core redeploys its registry and the Predict manifest lags, the sessions spot wrappers
	// would silently drive a stale registry. Failing here forces that to be a decision.
	test('deepbookRegistry matches the root REGISTRY_ID', () => {
		expect(TESTNET_SESSIONS.deepbookRegistry).toBe(testnetPackageIds.REGISTRY_ID);
	});
});

describe('units are reachable from every subpath, not just Predict', () => {
	test('getUnits returns the deployment-wide scale constants', () => {
		const u = getUnits('testnet');
		expect(u.quoteCoinDecimals).toBe(6);
		expect(u.fixedPointScale).toBe(1_000_000_000);
		expect(u.positionLotSize).toBe(10_000);
	});

	test('the Predict slice references the same object, so they cannot diverge', () => {
		expect(TESTNET_PREDICT.units).toBe(getUnits('testnet'));
	});

	test('an unrecorded network throws, and the message names the way out', () => {
		expect(() => getUnits('mainnet')).toThrow(/no deployment recorded for network 'mainnet'/);
		expect(() => getUnits('mainnet')).toThrow(/your own deploy manifest/);
	});
});

describe('sessions deployment ids', () => {
	// Pinned to what is live on testnet: the `SessionsConfig` object at this id reports type
	// `<sessionsPackageId>::session_config::SessionsConfig`, which is how the current sessions
	// package was told apart from the version retired by DBU-746.
	test('the sessions slice matches the deployment the SDK is pinned to', () => {
		const cfg = getSessionsConfig('testnet');
		expect(cfg.sessionsPackageId).toBe(
			'0xb74170443d6d2d37cbe95c7e530dd4a1605ef714ff4f9e88e27a7ac1455451db',
		);
		expect(cfg.sessionsConfig).toBe(
			'0xdfb8e23246678649cfdd6f3f6610057d5cadd6a8911a21dbe8e34788abbfab93',
		);
	});

	test('it carries the account ids sessions shares, identically', () => {
		const sessions = getSessionsConfig('testnet');
		const account = getAccountConfig('testnet');
		expect(sessions.accountPackageId).toBe(account.accountPackageId);
		expect(sessions.accountRegistry).toBe(account.accountRegistry);
	});

	test('it carries the spot-only ids the Predict wrappers never take', () => {
		const cfg = getSessionsConfig('testnet');
		expect(cfg.deepbookRegistry).toMatch(ADDRESS);
		expect(cfg.deepbookCoreAccountPackageId).toMatch(ADDRESS);
	});

	test('an unrecorded network throws rather than returning placeholder ids', () => {
		expect(() => getSessionsConfig('mainnet')).toThrow(/no sessions deployment/);
	});

	test('a SessionsContract built from it derives the same ids as an explicit config', () => {
		const cfg = getSessionsConfig('testnet');
		const fromRecord = new SessionsContract(cfg);
		const explicit = new SessionsContract({
			sessionsPackageId: cfg.sessionsPackageId,
			sessionsConfig: cfg.sessionsConfig,
			accountPackageId: cfg.accountPackageId,
			accountRegistry: cfg.accountRegistry,
		});
		const owner = '0x' + 'cd'.repeat(32);
		expect(fromRecord.deriveAccountId(owner)).toBe(explicit.deriveAccountId(owner));
		expect(fromRecord.deriveSessionsFieldId(owner)).toBe(explicit.deriveSessionsFieldId(owner));
	});
});
