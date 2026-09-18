// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Read-only simulation: no keys, signatures or transactions are submitted. Opt in with
// an existing Testnet account whose owner holds at least 10 quote coins in their wallet.
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { expect, test } from 'vitest';
import { deriveDynamicFieldID, normalizeStructTag } from '@mysten/sui/utils';
import {
	PredictClient,
	expiryMarketMoveCalls,
	generateAuth,
	toGeneratedConfig,
	POS_INF_TICK,
} from '../../../src/predict/index.js';
import { getSessionsConfig, SessionsContract } from '../../../src/sessions.js';
import { loadLivePricer } from '../../../src/predict/tx/trade.js';

const owner = process.env.PREDICT_SDK_SMOKE_OWNER;
const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
});
const pc = new PredictClient({ network: 'testnet', client });
const cfg = toGeneratedConfig(pc.cfg);
const sessions = new SessionsContract(getSessionsConfig('testnet'));

test.skipIf(!owner).each(['owner', 'session'] as const)(
	'v2 %s budget mint succeeds and agrees with the on-chain account quote',
	async (mode) => {
		const markets = (await pc.read.markets()).filter(
			(m) => !m.mintPaused && m.expiryMs > BigInt(Date.now() + 30_000),
		);
		const market = markets.sort((a, b) => Number(b.expiryMs - a.expiryMs))[0];
		expect(market, 'a live market with at least 30 seconds remaining is required').toBeDefined();
		const price = await pc.read.pricer({ underlying: 'BTC', expiryMs: market.expiryMs });
		const strike = Math.round(price.forward / market.admissionTickSize) * market.admissionTickSize;
		const lowerTick = BigInt(Math.round(strike / market.tickSize));
		const wrapperId = pc.wrapperIdFor(owner!);
		// Fund the account only inside this discarded simulation, so a wallet-funded
		// fixture need not keep a Predict balance between test runs.
		const tx = pc.tx.deposit(owner!, 10);
		tx.setSender(owner!);
		if (mode === 'session')
			tx.add(sessions.authorizeSession({ wrapperId, session: owner!, durationMs: 60_000 }));
		const feeds = pc.cfg.underlyings.BTC;
		const pricer = tx.add(
			loadLivePricer(cfg, {
				expiryMarketId: market.id,
				pythFeed: feeds.pythFeed,
				blockScholesValueStore: feeds.blockScholesValueStore,
				blockScholesSviStore: feeds.blockScholesSviStore,
			}),
		);
		const args = {
			market: market.id,
			wrapper: wrapperId,
			pricer,
			lowerTick,
			higherTick: POS_INF_TICK,
			maxCost: 10_000_000n,
			minQuantity: 1n,
		};
		const quoteResult = tx.add(
			expiryMarketMoveCalls.quoteMintExactCostForAccount({ config: cfg, arguments: args }),
		);
		if (mode === 'owner') {
			tx.add(
				expiryMarketMoveCalls.mintExactCost({
					config: cfg,
					arguments: { ...args, auth: tx.add(generateAuth(pc.cfg)) },
				}),
			);
		} else {
			tx.add(
				sessions.mintExactCost({
					expiryMarketId: market.id,
					wrapperId,
					protocolConfig: pc.cfg.objects.protocolConfig,
					pricer,
					lowerTick,
					higherTick: POS_INF_TICK,
					maxCost: 10_000_000n,
					minQuantity: 1n,
				}),
			);
		}
		const result = await client.core.simulateTransaction({
			transaction: tx,
			checksEnabled: false,
			include: { events: true, commandResults: true, objectTypes: true },
		});
		expect(
			result.$kind,
			JSON.stringify(result.FailedTransaction, (_, v) =>
				typeof v === 'bigint' ? v.toString() : v,
			),
		).toBe('Transaction');
		const quote = expiryMarketMoveCalls.MintQuote.parse(
			result.commandResults![quoteResult.Result].returnValues[0].bcs,
		);
		const receipt = pc.decode.mint({ events: result.Transaction!.events! });

		// Prove identities against actual VM output, not values calculated solely from SDK config.
		const types = result.Transaction!.objectTypes!;
		const events = result.Transaction!.events!;
		const original = pc.cfg.packages.predictV1!;
		expect(
			events
				.filter((event) => event.eventType.endsWith('::order_events::OrderMinted'))
				.map((event) => event.eventType),
		).toEqual([`${original}::order_events::OrderMinted`]);
		const dataKey = (pkg: string) =>
			`${pc.cfg.packages.account}::account::DataKey<${pkg}::predict_account::PredictApp>`;
		const accountId = sessions.deriveAccountId(owner!);
		const fieldId = deriveDynamicFieldID(accountId, dataKey(original), new Uint8Array([0]));
		const wrongFieldId = deriveDynamicFieldID(
			accountId,
			dataKey(pc.cfg.packages.predict),
			new Uint8Array([0]),
		);
		expect(fieldId).not.toBe(wrongFieldId);
		expect(types[fieldId]).toBeDefined();
		expect(normalizeStructTag(types[fieldId])).toBe(
			normalizeStructTag(
				`0x2::dynamic_field::Field<${dataKey(original)}, ${original}::predict_account::PredictData>`,
			),
		);
		expect(types[wrongFieldId]).toBeUndefined();
		if (mode === 'session') {
			const sessionCfg = getSessionsConfig('testnet');
			const sessionFieldId = sessions.deriveSessionsFieldId(owner!);
			const wrongSessions = new SessionsContract({
				...sessionCfg,
				sessionsPackageIdV1: sessionCfg.sessionsPackageId,
			});
			expect(types[sessionFieldId]).toBeDefined();
			expect(normalizeStructTag(types[sessionFieldId])).toBe(
				normalizeStructTag(
					`0x2::dynamic_field::Field<${pc.cfg.packages.account}::account::DataKey<${sessionCfg.sessionsPackageIdV1}::sessions::SessionsApp>, ${sessionCfg.sessionsPackageIdV1}::sessions::SessionsData>`,
				),
			);
			expect(types[wrongSessions.deriveSessionsFieldId(owner!)]).toBeUndefined();
			expect(
				events
					.filter((event) => event.eventType.endsWith('::sessions::SessionAuthorized'))
					.map((event) => event.eventType),
			).toEqual([`${sessionCfg.sessionsPackageIdV1}::sessions::SessionAuthorized`]);
		}
		expect(receipt.raw.quantity).toBe(quote.quantity);
		expect(receipt.raw.quantity % 10_000n).toBe(0n);
		expect(quote.all_in_cost).toBeGreaterThan(0n);
		expect(quote.all_in_cost).toBeLessThanOrEqual(10_000_000n);
		expect(quote.all_in_cost).toBe(
			receipt.raw.premium +
				receipt.raw.tradingFee -
				receipt.raw.feeIncentiveSubsidy +
				receipt.raw.builderFee +
				receipt.raw.penaltyFee +
				receipt.raw.inventoryImpactCharge,
		);
		expect(receipt.raw.entryProbability).toBe(quote.entry_probability);
	},
	30_000,
);
