// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from 'vitest';

import { MAINNET_CONFIG, TESTNET_CONFIG, getConfig } from '../../src/predict/config/index.js';

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
