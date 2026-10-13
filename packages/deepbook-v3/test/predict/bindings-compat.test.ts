// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The public move-call exports keep the argument keys the retired entry points shipped with,
// while the regenerated bindings capitalize them (their Move parameters are underscore-prefixed).
// Each compat call must emit the same move call as the generated one.

import { Transaction, type TransactionResult } from '@mysten/sui/transactions';
import { describe, expect, test } from 'vitest';
import * as generatedExpiryMarket from '../../src/contracts/deepbook_predict/expiry_market.js';
import * as generatedProtocolConfig from '../../src/contracts/deepbook_predict/protocol_config.js';
import { TESTNET_CONFIG } from '../../src/predict/config/index.js';
import { toGeneratedConfig } from '../../src/predict/config/generated.js';
import { expiryMarketMoveCalls, protocolConfigMoveCalls } from '../../src/predict/index.js';

const config = toGeneratedConfig(TESTNET_CONFIG);
const MARKET = '0x' + 'cd'.repeat(32);
const WRAPPER = '0x' + 'ef'.repeat(32);
const ADMIN_CAP = '0x' + 'aa'.repeat(32);

type Add = (tx: Transaction, auth: TransactionResult, pricer: TransactionResult) => void;

// The transaction data a thunk builds, given the auth and pricer results it takes.
function built(add: Add) {
	const tx = new Transaction();
	const auth = tx.moveCall({ target: '0x1::auth::make' });
	const pricer = tx.moveCall({ target: '0x1::pricer::make' });
	add(tx, auth, pricer);
	return JSON.stringify(tx.getData(), (_, v) => (typeof v === 'bigint' ? v.toString() : v));
}

describe('retired bindings keep their shipped argument keys', () => {
	test('the immediate trades', () => {
		const mintArgs = { market: MARKET, wrapper: WRAPPER, lowerTick: 7n, higherTick: 9n };
		const pascal = { Market: MARKET, Wrapper: WRAPPER, LowerTick: 7n, HigherTick: 9n };
		const cases: [shipped: Add, generated: Add][] = [
			[
				(tx, auth, pricer) =>
					tx.add(
						expiryMarketMoveCalls.mintExactQuantity({
							config,
							arguments: {
								...mintArgs,
								auth,
								pricer,
								quantity: 5n,
								maxCost: 6n,
								maxProbability: 7n,
							},
						}),
					),
				(tx, auth, pricer) =>
					tx.add(
						generatedExpiryMarket.mintExactQuantity({
							config,
							arguments: {
								...pascal,
								Auth: auth,
								Pricer: pricer,
								Quantity: 5n,
								MaxCost: 6n,
								MaxProbability: 7n,
							},
						}),
					),
			],
			[
				(tx, auth, pricer) =>
					tx.add(
						expiryMarketMoveCalls.mintExactAmount({
							config,
							arguments: {
								...mintArgs,
								auth,
								pricer,
								maxPremium: 5n,
								minQuantity: 6n,
								maxCost: 7n,
							},
						}),
					),
				(tx, auth, pricer) =>
					tx.add(
						generatedExpiryMarket.mintExactAmount({
							config,
							arguments: {
								...pascal,
								Auth: auth,
								Pricer: pricer,
								MaxPremium: 5n,
								MinQuantity: 6n,
								MaxCost: 7n,
							},
						}),
					),
			],
			[
				(tx, auth, pricer) =>
					tx.add(
						expiryMarketMoveCalls.mintExactCost({
							config,
							arguments: { ...mintArgs, auth, pricer, maxCost: 5n, minQuantity: 6n },
						}),
					),
				(tx, auth, pricer) =>
					tx.add(
						generatedExpiryMarket.mintExactCost({
							config,
							arguments: { ...pascal, Auth: auth, Pricer: pricer, MaxCost: 5n, MinQuantity: 6n },
						}),
					),
			],
			[
				(tx, auth, pricer) =>
					tx.add(
						expiryMarketMoveCalls.redeemLive({
							config,
							arguments: {
								market: MARKET,
								wrapper: WRAPPER,
								auth,
								pricer,
								orderId: 3n,
								closeQuantity: 4n,
								minProbability: 5n,
								minProceeds: 6n,
							},
						}),
					),
				(tx, auth, pricer) =>
					tx.add(
						generatedExpiryMarket.redeemLive({
							config,
							arguments: {
								Market: MARKET,
								Wrapper: WRAPPER,
								Auth: auth,
								Pricer: pricer,
								OrderId: 3n,
								CloseQuantity: 4n,
								MinProbability: 5n,
								MinProceeds: 6n,
							},
						}),
					),
			],
		];
		for (const [shipped, generated] of cases) {
			expect(built(shipped)).toBe(built(generated));
		}
	});

	test('the retired EWMA setters', () => {
		expect(
			built((tx) =>
				tx.add(
					protocolConfigMoveCalls.setEwmaParams({
						config,
						arguments: { AdminCap: ADMIN_CAP, alpha: 1n, zScoreThreshold: 2n, penaltyRate: 3n },
					}),
				),
			),
		).toBe(
			built((tx) =>
				tx.add(
					generatedProtocolConfig.setEwmaParams({
						config,
						arguments: { AdminCap: ADMIN_CAP, Alpha: 1n, ZScoreThreshold: 2n, PenaltyRate: 3n },
					}),
				),
			),
		);
		expect(
			built((tx) =>
				tx.add(
					protocolConfigMoveCalls.setEwmaEnabled({
						config,
						arguments: { AdminCap: ADMIN_CAP, enabled: false },
					}),
				),
			),
		).toBe(
			built((tx) =>
				tx.add(
					generatedProtocolConfig.setEwmaEnabled({
						config,
						arguments: { AdminCap: ADMIN_CAP, Enabled: false },
					}),
				),
			),
		);
	});

	test('every other export is the generated one', () => {
		expect(expiryMarketMoveCalls.quoteMintExactCostForAccount).toBe(
			generatedExpiryMarket.quoteMintExactCostForAccount,
		);
		expect(expiryMarketMoveCalls.MintQuote).toBe(generatedExpiryMarket.MintQuote);
		expect(protocolConfigMoveCalls.ProtocolConfig).toBe(generatedProtocolConfig.ProtocolConfig);
	});
});
