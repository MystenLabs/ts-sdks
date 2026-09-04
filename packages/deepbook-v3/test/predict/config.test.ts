// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from 'vitest';

import { TESTNET_CONFIG, getConfig } from '../../src/predict/config/index.js';

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

test('quoteCoinType is a well-formed coin type', () => {
	// Shape, not identity: the deployment record owns which coin it serves, and it changes
	// with the republish that carries the USDC collateral rename.
	expect(TESTNET_CONFIG.quoteCoinType).toMatch(/^0x[0-9a-f]+::[a-z_]+::[A-Za-z0-9_]+$/);
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

test('getConfig throws for mainnet, naming the package and the override', () => {
	expect(() => getConfig('mainnet')).toThrow(/no Predict deployment recorded for network/);
	expect(() => getConfig('mainnet')).toThrow(/pass `config` to PredictClient/);
});
