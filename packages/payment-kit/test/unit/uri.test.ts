// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { normalizeSuiAddress } from '@mysten/sui/utils';

import { createPaymentTransactionUri, parsePaymentTransactionUri } from '../../src/uri.js';

const TEST_ADDRESS = normalizeSuiAddress('0x1');
const TEST_COIN_TYPE = '0x2::sui::SUI';
const TEST_NONCE = 'test-nonce-123';

describe('createPaymentTransactionUri', () => {
	it('creates a valid URI with required parameters', () => {
		const uri = createPaymentTransactionUri({
			receiverAddress: TEST_ADDRESS,
			amount: 1000000n,
			coinType: TEST_COIN_TYPE,
			nonce: TEST_NONCE,
		});

		expect(uri).toContain('sui:pay?');
		expect(uri).toContain(`receiver=${encodeURIComponent(TEST_ADDRESS)}`);
		expect(uri).toContain('amount=1000000');
		expect(uri).toContain(`coinType=${encodeURIComponent(TEST_COIN_TYPE)}`);
		expect(uri).toContain(`nonce=${TEST_NONCE}`);
	});

	it('includes optional parameters when provided', () => {
		const uri = createPaymentTransactionUri({
			receiverAddress: TEST_ADDRESS,
			amount: 500n,
			coinType: TEST_COIN_TYPE,
			nonce: TEST_NONCE,
			label: 'Coffee',
			message: 'Thanks for the coffee',
			iconUrl: 'https://example.com/icon.png',
		});

		const parsed = parsePaymentTransactionUri(uri);
		expect(parsed.label).toEqual('Coffee');
		expect(parsed.message).toEqual('Thanks for the coffee');
		expect(parsed.iconUrl).toEqual('https://example.com/icon.png');
	});

	it('throws on invalid receiver address', () => {
		expect(() =>
			createPaymentTransactionUri({
				receiverAddress: 'not-an-address',
				amount: 1000n,
				coinType: TEST_COIN_TYPE,
				nonce: TEST_NONCE,
			}),
		).toThrow('Invalid Sui address');
	});

	it('throws on non-positive amount', () => {
		expect(() =>
			createPaymentTransactionUri({
				receiverAddress: TEST_ADDRESS,
				amount: 0n,
				coinType: TEST_COIN_TYPE,
				nonce: TEST_NONCE,
			}),
		).toThrow('Amount must be a positive');
	});

	it('throws on nonce exceeding 36 characters', () => {
		expect(() =>
			createPaymentTransactionUri({
				receiverAddress: TEST_ADDRESS,
				amount: 1000n,
				coinType: TEST_COIN_TYPE,
				nonce: 'a'.repeat(37),
			}),
		).toThrow('Nonce length exceeds maximum');
	});
});

describe('parsePaymentTransactionUri', () => {
	it('throws on invalid URI prefix', () => {
		expect(() => parsePaymentTransactionUri('https://example.com')).toThrow(
			'Must start with sui:pay?',
		);
	});

	it('throws on missing required parameters', () => {
		expect(() => parsePaymentTransactionUri('sui:pay?receiver=' + TEST_ADDRESS)).toThrow(
			'Missing required parameters',
		);
	});
});

describe('URI round-trip', () => {
	it('preserves all required fields through encode/decode', () => {
		const original = {
			receiverAddress: TEST_ADDRESS,
			amount: 1000000n,
			coinType: TEST_COIN_TYPE,
			nonce: TEST_NONCE,
		};

		const uri = createPaymentTransactionUri(original);
		const parsed = parsePaymentTransactionUri(uri);

		expect(parsed.receiverAddress).toEqual(original.receiverAddress);
		expect(parsed.amount).toEqual(original.amount);
		expect(parsed.coinType).toEqual(original.coinType);
		expect(parsed.nonce).toEqual(original.nonce);
	});

	it('preserves optional fields through encode/decode', () => {
		const original = {
			receiverAddress: TEST_ADDRESS,
			amount: 500n,
			coinType: TEST_COIN_TYPE,
			nonce: TEST_NONCE,
			label: 'Coffee',
			message: 'Thanks for the coffee',
			iconUrl: 'https://example.com/icon.png',
		};

		const uri = createPaymentTransactionUri(original);
		const parsed = parsePaymentTransactionUri(uri);

		expect(parsed.label).toEqual(original.label);
		expect(parsed.message).toEqual(original.message);
		expect(parsed.iconUrl).toEqual(original.iconUrl);
	});

	it('preserves registry ID through encode/decode', () => {
		const registryId = normalizeSuiAddress('0xabc');
		const original = {
			receiverAddress: TEST_ADDRESS,
			amount: 1000n,
			coinType: TEST_COIN_TYPE,
			nonce: TEST_NONCE,
			registryId,
		};

		const uri = createPaymentTransactionUri(original);
		const parsed = parsePaymentTransactionUri(uri);

		expect(parsed.registryId).toEqual(registryId);
	});

	it('preserves registry name through encode/decode', () => {
		const original = {
			receiverAddress: TEST_ADDRESS,
			amount: 1000n,
			coinType: TEST_COIN_TYPE,
			nonce: TEST_NONCE,
			registryName: 'my-store',
		};

		const uri = createPaymentTransactionUri(original);
		const parsed = parsePaymentTransactionUri(uri);

		expect(parsed.registryName).toEqual(original.registryName);
	});
});
