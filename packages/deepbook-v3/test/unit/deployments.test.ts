// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, test } from 'vitest';

import { getAccountConfig } from '../../src/account.js';
import { testnetPackageIds } from '../../src/utils/constants.js';
import {
	getDeployment,
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
		expect(() => getAccountConfig('mainnet')).toThrow(/no account deployment/);
		expect(() => getDeployment('mainnet')).toThrow(/no deployment recorded/);
	});

	test('the returned config is a copy, so a caller cannot mutate the record', () => {
		const cfg = getAccountConfig('testnet');
		cfg.accountRegistry = '0x' + '00'.repeat(32);
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
