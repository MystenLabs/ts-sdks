// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { ExtendedHashiClient, isLocalnet, makeClient } from './_env.js';

/**
 * Integration tests for `HashiClient.view.*`.
 *
 * Same test bodies run against both targets:
 *  - **devnet** (default): hits `https://fullnode.devnet.sui.io:443`. A
 *    5-second spacer runs after every test to avoid public-RPC rate limiting.
 *  - **localnet** (CI): hits a fresh `hashi-localnet` Sui node on `127.0.0.1`.
 *    No rate limit, so we drop the spacer.
 *
 * Values are checked as loose invariants (types, positivity, floor
 * relationships) rather than exact matches, because both targets carry
 * configurable governance state.
 */
describe('HashiClient.view', () => {
	let client: ExtendedHashiClient;

	beforeAll(() => {
		client = makeClient();
	});

	if (!isLocalnet()) {
		afterEach(() => new Promise((resolve) => setTimeout(resolve, 5000)));
	}

	const TIMEOUT = 30_000;

	it(
		'all returns a full governance snapshot in a single round-trip',
		async () => {
			const snap = await client.hashi.view.all();

			expect(typeof snap.paused).toBe('boolean');
			expect(typeof snap.bitcoinChainId).toBe('string');
			expect(snap.bitcoinChainId).toMatch(/^0x[0-9a-f]{64}$/);
			expect(typeof snap.bitcoinDepositMinimum).toBe('bigint');
			expect(typeof snap.bitcoinWithdrawalMinimum).toBe('bigint');
			expect(typeof snap.bitcoinConfirmationThreshold).toBe('bigint');
			expect(typeof snap.withdrawalCancellationCooldownMs).toBe('bigint');
			expect(typeof snap.depositMinimum).toBe('bigint');
			expect(typeof snap.worstCaseNetworkFee).toBe('bigint');
		},
		TIMEOUT,
	);

	it(
		'mpcPublicKey returns a 33-byte compressed secp256k1 key',
		async () => {
			const key = await client.hashi.view.mpcPublicKey();
			expect(key).toBeInstanceOf(Uint8Array);
			expect(key.length).toBe(33);
			expect(key[0]).toBeOneOf([0x02, 0x03]);
		},
		TIMEOUT,
	);

	it(
		'paused returns a boolean',
		async () => {
			const paused = await client.hashi.view.paused();
			expect(typeof paused).toBe('boolean');
		},
		TIMEOUT,
	);

	it(
		'bitcoinDepositMinimum is at least DUST_RELAY_MIN_VALUE (546)',
		async () => {
			const min = await client.hashi.view.bitcoinDepositMinimum();
			expect(min).toBeGreaterThanOrEqual(546n);
		},
		TIMEOUT,
	);

	it(
		'bitcoinWithdrawalMinimum is at least DUST_RELAY_MIN_VALUE + 1 (547)',
		async () => {
			const min = await client.hashi.view.bitcoinWithdrawalMinimum();
			expect(min).toBeGreaterThanOrEqual(547n);
		},
		TIMEOUT,
	);

	it(
		'bitcoinConfirmationThreshold is positive',
		async () => {
			const n = await client.hashi.view.bitcoinConfirmationThreshold();
			expect(n).toBeGreaterThan(0n);
		},
		TIMEOUT,
	);

	it(
		'withdrawalCancellationCooldownMs is non-negative',
		async () => {
			const ms = await client.hashi.view.withdrawalCancellationCooldownMs();
			expect(ms).toBeGreaterThanOrEqual(0n);
		},
		TIMEOUT,
	);

	it(
		'bitcoinChainId is a 0x-prefixed 32-byte hex address',
		async () => {
			const id = await client.hashi.view.bitcoinChainId();
			expect(id).toMatch(/^0x[0-9a-f]{64}$/);
		},
		TIMEOUT,
	);

	it(
		'depositMinimum equals bitcoinDepositMinimum',
		async () => {
			const snap = await client.hashi.view.all();
			expect(snap.depositMinimum).toBe(snap.bitcoinDepositMinimum);
		},
		TIMEOUT,
	);

	it(
		'worstCaseNetworkFee equals bitcoinWithdrawalMinimum - 546',
		async () => {
			const snap = await client.hashi.view.all();
			expect(snap.worstCaseNetworkFee).toBe(snap.bitcoinWithdrawalMinimum - 546n);
			expect(snap.worstCaseNetworkFee).toBeGreaterThanOrEqual(1n);
		},
		TIMEOUT,
	);

	it(
		'findUsedUtxos returns not-used for a made-up UTXO',
		async () => {
			const results = await client.hashi.view.findUsedUtxos([
				{ txid: '0x' + 'ab'.repeat(32), vout: 0 },
			]);
			expect(results).toHaveLength(1);
			expect(results[0].isUsed).toBe(false);
			expect(results[0].inActivePool).toBe(false);
			expect(results[0].inSpentPool).toBe(false);
		},
		TIMEOUT,
	);

	it(
		'findUsedUtxos returns empty array for empty input',
		async () => {
			const results = await client.hashi.view.findUsedUtxos([]);
			expect(results).toEqual([]);
		},
		TIMEOUT,
	);

	it(
		'transactionHistory returns empty array for an address with no requests',
		async () => {
			const items = await client.hashi.view.transactionHistory('0x' + '00'.repeat(32));
			expect(items).toEqual([]);
		},
		TIMEOUT,
	);
});
