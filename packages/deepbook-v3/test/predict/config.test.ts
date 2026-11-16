// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from 'vitest';

import { MAINNET_CONFIG, TESTNET_CONFIG, getConfig } from '../../src/predict/config/index.js';
import { getSessionsConfig } from '../../src/sessions.js';

const ID_RE = /^0x[0-9a-f]{1,64}$/;

test('all package IDs are well-formed', () => {
	expect(TESTNET_CONFIG.packages.predict).toMatch(ID_RE);
	expect(TESTNET_CONFIG.packages.account).toMatch(ID_RE);
	expect(TESTNET_CONFIG.packages.propbook).toMatch(ID_RE);
});

test('all shared object IDs are well-formed', () => {
	for (const id of Object.values(TESTNET_CONFIG.objects)) {
		expect(id).toMatch(ID_RE);
	}
});

test('Testnet records delayed execution', () => {
	// Testnet's v5 rollout (DBU-887) introduced the delayed-execution types, and the relink to
	// Propbook v2 (DBU-1027) moved the call targets: predict_orders v2 and predict_math v2. The
	// cadence-table upgrade (DBU-1109) moved Predict to v7, the Version 5 rehearsal (DBU-1117) to
	// v8 with predict_orders v3, the P-33 SVI-decimals pass (DBU-1152) to v9 with orders v4, and the fee-band pass to v10 with orders v5. The delayed-execution type origin stays v5, and predict_orders'
	// events stay typed by its v1 original ID.
	expect(TESTNET_CONFIG.packages.predict).toBe(
		'0xbb6a1595d6ab45f41658fcb032e0dfb2cd87f2613825a26f5bcbe98d2c8c9ce8',
	);
	expect(TESTNET_CONFIG.packages.predictDelayedExecution).toBe(
		'0x0654ecbed7c0f2645d9de7cb6cf08e65c2ee05cdbb39a415f17a6bd1cd92e267',
	);
	expect(TESTNET_CONFIG.packages.predictOrders).toBe(
		'0xc43f12fec34351058cf80d5fd127248f14a4045429f2f56ee20695c4c9cdf3bf',
	);
	expect(TESTNET_CONFIG.packages.predictOrdersV1).toBe(
		'0xd723ddef890bff70bd492cd384c913b5e7daeb6e8900cb3a5606546ac4f3907f',
	);
	expect(TESTNET_CONFIG.packages.predictMath).toBe(
		'0x2039bac8c1ec51ce3d7cb366ec36b45fdbbafe1aa2aaea0ed9bef52db40e1562',
	);
	expect(TESTNET_CONFIG.objects.orderDesk).toBe(
		'0x160fc026c4143f3dec36acfc6556379d54661d37fe28ad837b6a85e42aeddfea',
	);
	expect(TESTNET_CONFIG.objects.queueRegistry).toBe(
		'0xe9d75ed05b089d52a660a94b94963cdc89aeb7f3c75b57f76771454c81faae1f',
	);
	expect(TESTNET_CONFIG.oracle?.pythLazerState).toMatch(ID_RE);
	expect(Object.isFrozen(TESTNET_CONFIG.packages)).toBe(true);
	expect(Object.isFrozen(TESTNET_CONFIG.objects)).toBe(true);
});

test('Mainnet records delayed execution', () => {
	// Mainnet's Version 5 upgrades: Predict v5 and `deepbook_predict_orders` v2 are the call
	// targets. Predict v4, which introduced delayed execution, stays the origin of its types and
	// events, and `predictV1` / `predictOrdersV1` keep the original IDs for the v1 types.
	expect(MAINNET_CONFIG.packages.predict).toBe(
		'0xb0aaafe0d7ddd754243202fb6337e503be98d8f363f6343a46c59540180be463',
	);
	expect(MAINNET_CONFIG.packages.predictV1).toBe(
		'0x89aea622e7bb3bdd598bde87dde40ee31c9eed4971b9546e23ec83de3c48bbba',
	);
	expect(MAINNET_CONFIG.packages.predictDelayedExecution).toBe(
		'0x98235c5842831c9b5f51dc637cf34c91db2aca5510802eb6ebfec63f5b71a7bb',
	);
	expect(MAINNET_CONFIG.packages.predictOrders).toBe(
		'0x48e78879ee871c7c94807ee895e83a87c16bb37c8a558ac23584a315a2312dce',
	);
	expect(MAINNET_CONFIG.packages.predictOrdersV1).toBe(
		'0x7cd41de311f8f3efb2c239b38773a4010fce3bef0120cd55f479843077c98903',
	);
	expect(MAINNET_CONFIG.packages.predictMath).toBe(
		'0x2919b07ab2b995075cf2d0f9a72aeeb2d45636d3ba2a87dda35ac6b26f124c8e',
	);
	expect(MAINNET_CONFIG.packages.accountLatest).toBe(
		'0x3dbf966f4d02a3ae4b996f5d2e81603164b598f9ff5db2bd8a2bf03ffebb4316',
	);
	expect(MAINNET_CONFIG.packages.predictCurrentVersion).toBe(5n);
	expect(MAINNET_CONFIG.packages.predictOrdersCurrentVersion).toBe(2n);
	expect(MAINNET_CONFIG.objects.orderDesk).toBe(
		'0x87b0a87262aacf58eaff567eed2fb7cb0f9cbc1f5ce33ef79216cd26d13a1b5b',
	);
	expect(MAINNET_CONFIG.objects.queueRegistry).toBe(
		'0x8d4f0c671862f065ac7f2c2cb24abc47cf75ed8fc8e5e52c1d4bdfa53eee164f',
	);
	expect(MAINNET_CONFIG.oracle?.pythLazerState).toBe(
		'0xd0db9c1e9212a98120384bf78d8b8c985d87b9ee6921dffcf9d1394062911573',
	);
	expect(Object.isFrozen(MAINNET_CONFIG.packages)).toBe(true);
	expect(Object.isFrozen(MAINNET_CONFIG.objects)).toBe(true);
	// The two networks' order-flow deployments are distinct publications.
	expect(MAINNET_CONFIG.packages.predictOrders).not.toBe(TESTNET_CONFIG.packages.predictOrders);
	expect(MAINNET_CONFIG.objects.orderDesk).not.toBe(TESTNET_CONFIG.objects.orderDesk);
});

test('Mainnet sessions target v4, with the spot pool allowlist and builder approvals', () => {
	// The Mainnet Sessions v4 upgrade. `sessionsPackageIdV1` keeps the original ID, which the
	// `SessionsApp` dynamic-field key and the v1 session events are typed by.
	const sessions = getSessionsConfig('mainnet');
	expect(sessions.sessionsPackageId).toBe(
		'0x6069298c3d0d2e435e6621a19669f66b242baeaaaed27365943d53dc6c1d9b42',
	);
	expect(sessions.sessionsPackageIdV1).toBe(
		'0x9a068beffa019ae756f4a6d2611e9899d3c6dd888812dd9eca87535d2ac55e2a',
	);
	expect(sessions.protocolConfig).toBe(MAINNET_CONFIG.objects.protocolConfig);
});

test('quoteCoinType is the renamed USDC collateral', () => {
	// The module path is the assertion: the collateral rename means every deployment from
	// here on serves `usdc::usdc::USDC`. The package id is deliberately not pinned — that is
	// the deployment record's to own, and it moves with each republish.
	expect(TESTNET_CONFIG.quoteCoinType).toMatch(/^0x[0-9a-f]{64}::usdc::USDC$/);
});

test('BTC underlying is present and well-formed', () => {
	const btc = TESTNET_CONFIG.underlyings.BTC;
	expect(btc.symbol).toBe('BTC');
	expect(Number.isInteger(btc.propbookUnderlyingId)).toBe(true);
	expect(btc.pythFeed).toMatch(ID_RE);
	expect(btc.blockScholesValueStore).toMatch(ID_RE);
	expect(btc.blockScholesSviStore).toMatch(ID_RE);
});

test('getConfig returns the testnet config', () => {
	expect(getConfig('testnet')).toBe(TESTNET_CONFIG);
});

test('getConfig throws for an unrecorded network, naming the package and the override', () => {
	expect(() => getConfig('devnet')).toThrow(/no Predict deployment recorded for network/);
	expect(() => getConfig('devnet')).toThrow(/pass `config` to PredictClient/);
});

test('getConfig returns the mainnet config', () => {
	expect(getConfig('mainnet')).toBe(MAINNET_CONFIG);
});

test('mainnet package and object IDs are well-formed', () => {
	expect(MAINNET_CONFIG.packages.predict).toMatch(ID_RE);
	expect(MAINNET_CONFIG.packages.account).toMatch(ID_RE);
	expect(MAINNET_CONFIG.packages.propbook).toMatch(ID_RE);
	for (const id of Object.values(MAINNET_CONFIG.objects)) {
		expect(id).toMatch(ID_RE);
	}
});

test('mainnet settles in Circle native USDC, not a republished copy', () => {
	// The whole point of the collateral rename: one module path resolves on both networks, and
	// on mainnet it must resolve to Circle's package rather than an in-repo coin we published.
	// This is an identity assertion on purpose — getting it wrong would settle a live market in
	// a worthless look-alike.
	expect(MAINNET_CONFIG.quoteCoinType).toBe(
		'0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
	);
});

test('the two networks are distinct deployments', () => {
	expect(MAINNET_CONFIG.packages.predict).not.toBe(TESTNET_CONFIG.packages.predict);
	expect(MAINNET_CONFIG.quoteCoinType).not.toBe(TESTNET_CONFIG.quoteCoinType);
});
