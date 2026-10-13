// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Read-only simulation: no keys, signatures or transactions are submitted. Opt in with
// an existing Testnet account whose owner holds at least 10 quote coins in their wallet.
// The account's budget quote must match the local cost model, and the retired immediate
// budget mint must abort `EDelayedExecutionRequired`, for the owner and for a session key.
import { bcs } from '@mysten/sui/bcs';
import { accountMoveCalls } from '../../../src/account.js';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { expect, test } from 'vitest';
import { normalizeStructTag } from '@mysten/sui/utils';
import {
	PredictClient,
	cost,
	predictAccountMoveCalls,
	protocolConfigMoveCalls,
	expiryMarketMoveCalls,
	generateAuth,
	toGeneratedConfig,
	POS_INF_TICK,
} from '../../../src/predict/index.js';
import { decodeMoveAbort, type MoveAbortError } from '../../../src/predict/errors.js';
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
	'v4 %s budget quote agrees with the local cost, and the retired budget mint aborts',
	async (mode) => {
		const markets = (await pc.read.markets()).filter(
			(m) => !m.mintPaused && m.expiryMs > BigInt(Date.now() + 30_000),
		);
		const market = markets.sort((a, b) => Number(b.expiryMs - a.expiryMs))[0];
		expect(market, 'a live market with at least 30 seconds remaining is required').toBeDefined();
		const { object: marketObject } = await client.core.getObject({
			objectId: market.id,
			include: { content: true },
		});
		const state = expiryMarketMoveCalls.ExpiryMarket.parse(marketObject.content!);
		const policy = state.strike_exposure.config;
		const { object: configObject } = await client.core.getObject({
			objectId: pc.cfg.objects.protocolConfig,
			include: { content: true },
		});
		const protocol = protocolConfigMoveCalls.ProtocolConfig.parse(configObject.content!);
		// Nonzero impact and congestion are covered by deterministic accounting tests.
		// Fail explicitly if this live fixture starts needing an evolving payout-tree/EWMA snapshot.
		expect(policy.inventory_impact_max_rate).toBe(0n);
		expect(protocol.ewma_config.enabled).toBe(false);
		const price = await pc.read.pricer({ underlying: 'BTC', expiryMs: market.expiryMs });
		const strike = Math.round(price.forward / market.admissionTickSize) * market.admissionTickSize;
		const lowerTick = BigInt(Math.round(strike / market.tickSize));
		const wrapperId = pc.wrapperIdFor(owner!);
		const feeds = pc.cfg.underlyings.BTC;

		// Each simulation funds the account only inside itself, so a wallet-funded fixture need
		// not keep a Predict balance between test runs. `retiredMint` appends the immediate budget
		// mint, which Predict v4 always aborts.
		const build = (retiredMint: boolean) => {
			const tx = pc.tx.deposit(owner!, 10);
			tx.setSender(owner!);
			if (mode === 'session')
				tx.add(sessions.authorizeSession({ wrapperId, session: owner!, durationMs: 60_000 }));
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
			const sponsorResult = tx.add(
				expiryMarketMoveCalls.feeIncentiveBalance({
					config: cfg,
					arguments: { market: market.id },
				}),
			);
			const account = tx.add(
				accountMoveCalls.loadAccount({ config: cfg, arguments: { self: wrapperId } }),
			);
			const builderResult = tx.add(
				predictAccountMoveCalls.builderCodeId({ config: cfg, arguments: { account } }),
			);
			const timeResult = tx.moveCall({
				target: '0x2::clock::timestamp_ms',
				arguments: [tx.object('0x6')],
			});
			const quoteResult = tx.add(
				expiryMarketMoveCalls.quoteMintExactCostForAccount({ config: cfg, arguments: args }),
			);
			if (retiredMint && mode === 'owner') {
				// The shipped lowercase keys still build the retired call.
				tx.add(
					expiryMarketMoveCalls.mintExactCost({
						config: cfg,
						arguments: { ...args, auth: tx.add(generateAuth(pc.cfg)) },
					}),
				);
			} else if (retiredMint) {
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
			return { tx, sponsorResult, builderResult, timeResult, quoteResult };
		};

		const quoted = build(false);
		const result = await client.core.simulateTransaction({
			transaction: quoted.tx,
			checksEnabled: false,
			include: { events: true, commandResults: true, objectTypes: true },
		});
		expect(
			result.$kind,
			JSON.stringify(result.FailedTransaction, (_, v) =>
				typeof v === 'bigint' ? v.toString() : v,
			),
		).toBe('Transaction');
		// The deposit's coin intent resolves into commands ahead of the ones built here, so index
		// from the end: the quote is the last command.
		const offset = result.commandResults!.length - 1 - quoted.quoteResult.Result;
		const rawReturn = (index: number) => result.commandResults![index + offset].returnValues[0].bcs;
		const quote = expiryMarketMoveCalls.MintQuote.parse(rawReturn(quoted.quoteResult.Result));
		const local = cost.mintCostForBudget({
			fees: {
				baseFee: policy.base_fee,
				minFee: policy.min_fee,
				expiryFeeWindowMs: policy.expiry_fee_window_ms,
				expiryFeeMaxMultiplier: policy.expiry_fee_max_multiplier,
				minEntryProbability: policy.min_entry_probability,
				maxEntryProbability: policy.max_entry_probability,
				inventoryImpactMaxRate: policy.inventory_impact_max_rate,
				inventoryImpactScale: state.strike_exposure.inventory_impact_scale,
				backingBufferLambda: policy.backing_buffer_lambda,
			},
			expiryMs: state.expiry,
			nowMs: BigInt(bcs.u64().parse(rawReturn(quoted.timeResult.Result))),
			// This is an UP order. Its raw range probability is its single finite boundary.
			probabilities: { lowerUp: quote.entry_probability, higherUp: null },
			builderCode: bcs.option(bcs.Address).parse(rawReturn(quoted.builderResult.Result)) !== null,
			feeIncentiveBalance: BigInt(bcs.u64().parse(rawReturn(quoted.sponsorResult.Result))),
			budget: 10_000_000n,
			minQuantity: 1n,
		});
		expect(local.raw).toMatchObject({
			quantity: quote.quantity,
			premium: quote.premium,
			entryProbability: quote.entry_probability,
			tradingFee: quote.trading_fee,
			subsidy: quote.fee_incentive_subsidy,
			builderFee: quote.builder_fee,
			penaltyFee: quote.penalty_fee,
			impactCharge: quote.inventory_impact_charge,
			cost: quote.all_in_cost,
		});
		expect(quote.quantity % 10_000n).toBe(0n);
		expect(quote.all_in_cost).toBeGreaterThan(0n);
		expect(quote.all_in_cost).toBeLessThanOrEqual(10_000_000n);

		// Prove the session field's identity against actual VM output.
		if (mode === 'session') {
			const types = result.Transaction!.objectTypes!;
			const events = result.Transaction!.events!;
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

		// The immediate budget mint is retired: Predict v4 always aborts it.
		const retired = await client.core.simulateTransaction({
			transaction: build(true).tx,
			checksEnabled: false,
			include: { effects: true },
		});
		expect(retired.$kind).toBe('FailedTransaction');
		const abort = decodeMoveAbort(
			retired.FailedTransaction!.effects!.status.error as MoveAbortError,
		);
		expect(abort?.module).toBe('expiry_market');
		expect(abort?.abortName).toBe('EDelayedExecutionRequired');
	},
	30_000,
);
