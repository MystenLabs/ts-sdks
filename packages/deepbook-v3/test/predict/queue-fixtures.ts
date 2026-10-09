// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Shared fixtures for the delayed-execution (DBU-885) tests: queue records, policies and a mock
// client that answers the queue reads by the Move functions in each simulated PTB. Records and
// policies serialize with the GENERATED layouts, so a fixture can't drift from the Move structs.
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import * as expiryMarket from '../../src/contracts/deepbook_predict/expiry_market.js';
import { DelayedExecutionPolicy } from '../../src/contracts/deepbook_predict_orders/delayed_execution_config.js';
import { OrderView } from '../../src/contracts/deepbook_predict_orders/order_queue.js';
import { TESTNET_CONFIG } from '../../src/predict/config/index.js';
import type { PredictConfig } from '../../src/predict/config/index.js';
import { deriveQueueId } from '../../src/predict/queue-id.js';
import type { ReadClient } from '../../src/predict/reads/inspect.js';

/** A stand-in for the Predict upgrade that added delayed execution: any id distinct from v1. */
export const DELAYED_PKG = '0x' + 'de'.repeat(32);
/** A stand-in for the order-flow companion, `deepbook_predict_orders`. */
export const ORDERS_PKG = '0x' + '0d'.repeat(32);
/** A stand-in for the math library, `deepbook_predict_math`. */
export const MATH_PKG = '0x' + '3a'.repeat(32);
/** A stand-in for the companion's shared `OrderDesk`. */
export const DESK = '0x' + 'd6'.repeat(32);
/**
 * A stand-in for the companion's shared `QueueRegistry`, which queue IDs derive from. Distinct from
 * {@link DESK}, so a derivation from the wrong parent fails.
 */
export const REGISTRY = '0x' + 'd5'.repeat(32);

/**
 * A deployment without delayed execution recorded: Testnet's ids with every delayed-execution
 * field removed, as Testnet stood before its v5 rollout and Mainnet stands until its own.
 */
export const LEGACY_CFG: PredictConfig = {
	...TESTNET_CONFIG,
	packages: {
		predict: TESTNET_CONFIG.packages.predict,
		predictV1: TESTNET_CONFIG.packages.predictV1,
		account: TESTNET_CONFIG.packages.account,
		propbook: TESTNET_CONFIG.packages.propbook,
	},
	objects: {
		registry: TESTNET_CONFIG.objects.registry,
		protocolConfig: TESTNET_CONFIG.objects.protocolConfig,
		poolVault: TESTNET_CONFIG.objects.poolVault,
		oracleRegistry: TESTNET_CONFIG.objects.oracleRegistry,
		accountRegistry: TESTNET_CONFIG.objects.accountRegistry,
	},
	oracle: undefined,
};

/** Testnet's ids with stand-in delayed-execution ids, as a localnet `config` would carry it. */
export const QUEUE_CFG: PredictConfig = {
	...TESTNET_CONFIG,
	packages: {
		...TESTNET_CONFIG.packages,
		// A config records the upgrade as both the call target and the new types' origin.
		predict: DELAYED_PKG,
		predictDelayedExecution: DELAYED_PKG,
		predictOrders: ORDERS_PKG,
		predictMath: MATH_PKG,
	},
	objects: { ...TESTNET_CONFIG.objects, orderDesk: DESK, queueRegistry: REGISTRY },
	oracle: { pythLazerState: '0x' + '1a'.repeat(32) },
};

/** The market the queue fixtures address, and its queue under {@link REGISTRY}. */
export const MARKET = '0x' + 'cd'.repeat(32);
export const QUEUE = deriveQueueId(REGISTRY, MARKET);

export type PolicyFields = (typeof DelayedExecutionPolicy)['$inferType'];
export type RecordFields = (typeof OrderView)['$inferType'];

/** The launch policy: 800 ms delay on the 200 ms channel, 0.02 USDC fee, 100 + 100, cap 5. */
export function policyFields(overrides: Partial<PolicyFields> = {}): PolicyFields {
	return {
		delay_ms: 800n,
		stall_timeout_ms: 5_000n,
		stuck_threshold_ms: 1_500n,
		gap_wait_ms: 2_000n,
		pyth_price_buffer_ms: 0n,
		pyth_channel: 3,
		svi_max_age_ms: 60_000n,
		mint_capacity: 100n,
		sell_capacity: 100n,
		per_account_cap: 5n,
		order_fee: 20_000n,
		min_sell_quantity: 1_000_000n,
		settle_refund_batch: 450n,
		settle_payout_batch: 900n,
		...overrides,
	};
}

/** A queue record with every field present; the parts a test cares about are overridden. */
export function recordFields(
	overrides: {
		status?: number;
		kind?: number;
		accountId?: string;
		timing?: Partial<RecordFields['timing']>;
		position?: Partial<RecordFields['position']>;
		price?: Partial<RecordFields['price']>;
		result?: Partial<RecordFields['result']>;
		receiptStage?: number;
		funds?: bigint;
	} = {},
): RecordFields {
	return {
		status: overrides.status ?? 0,
		kind: overrides.kind ?? 0,
		request: {
			lower_tick: 10_500_000n,
			higher_tick: (1n << 30n) - 1n,
			quantity: 10_000_000n,
			max_premium: 0n,
			min_quantity: 0n,
			max_cost: 6_000_000n,
			max_probability: 600_000_000n,
			min_probability: 0n,
			min_proceeds: 0n,
		},
		account_id: overrides.accountId ?? '0x' + '22'.repeat(32),
		receive_address: '0x' + '44'.repeat(32),
		timing: {
			placed_at_ms: 1_000_000n,
			earliest_price_ms: 1_000_800n,
			tau_ms: 1_000_800n,
			deadline_ms: 1_005_800n,
			cutoff_ms: 2_000_000n,
			pyth_channel: 3,
			...overrides.timing,
		},
		escrow: {
			budget: 6_000_000n,
			order_fee: 20_000n,
			subsidy_bound: 0n,
			subsidy_reserved: 0n,
			cash_need: 9_900_001n,
		},
		position: { order_id: 0n, root_id: 0n, opened_at_ms: 0n, ...overrides.position },
		price: { spot: 0n, tick_ms: 0n, generation_us: 0n, ...overrides.price },
		result: { reason: 0, quantity: 0n, amount: 0n, finished_at_ms: 0n, ...overrides.result },
		receipt_stage: overrides.receiptStage ?? 1,
		funds: overrides.funds ?? 6_020_000n,
	};
}

const u64 = (v: bigint) => bcs.u64().serialize(v).toBytes();
const bool = (v: boolean) => bcs.bool().serialize(v).toBytes();
const optU64 = (v: bigint | null) => bcs.option(bcs.u64()).serialize(v).toBytes();

/** The chain state a {@link queueClient} serves. Every field has a passing default. */
export interface QueueScenario {
	expiryMs: bigint;
	mintPaused: boolean;
	cashBalance: bigint;
	requiredCash: bigint;
	waitingCashNeed: bigint;
	minEntryProbability: bigint;
	backingBufferLambda: bigint;
	stuck: boolean;
	heads: [bigint, bigint, bigint, bigint];
	pending: [bigint, bigint];
	payoutCompleted: boolean;
	policy: PolicyFields;
	deskWatermark: bigint;
	noTradeWindowMs: bigint;
	subsidyRate: bigint;
	tradingPaused: boolean;
	frozen: boolean;
	watermark: bigint;
	orderFlowEnabled: boolean;
	/** Whether the market's `MarketQueue` exists (`getObjects` finds it). */
	queueExists: boolean;
	waitingOrders: bigint;
	available: bigint;
	records: Map<bigint, RecordFields>;
	mintQuote: (typeof expiryMarket.MintQuote)['$inferType'];
	redeemQuote: (typeof expiryMarket.RedeemQuote)['$inferType'];
	tickSizeRaw: bigint;
	/** Object IDs `getObjects` reports missing, such as an owner's account wrapper. */
	missingObjects: Set<string>;
	/**
	 * `quote_mint`'s all-in price per contract, 1e9-scaled: the account-free quote prices its
	 * requested quantity at this flat price, at the scenario quote's probability.
	 */
	anonymousPricePerContract: bigint;
}

export function scenario(overrides: Partial<QueueScenario> = {}): QueueScenario {
	return {
		expiryMs: BigInt(Date.now()) + 3_600_000n,
		mintPaused: false,
		cashBalance: 1_000_000_000n,
		requiredCash: 500_000_000n,
		waitingCashNeed: 0n,
		minEntryProbability: 10_000_000n,
		backingBufferLambda: 310_000_000n,
		stuck: false,
		heads: [0n, 0n, 0n, 0n],
		pending: [0n, 0n],
		payoutCompleted: false,
		policy: policyFields(),
		deskWatermark: 1n,
		noTradeWindowMs: 10_000n,
		subsidyRate: 200_000_000n,
		tradingPaused: false,
		frozen: false,
		watermark: 4n,
		orderFlowEnabled: true,
		queueExists: true,
		waitingOrders: 0n,
		available: 100_000_000n,
		records: new Map(),
		mintQuote: {
			quantity: 10_000_000n,
			entry_probability: 400_000_000n,
			premium: 4_000_000n,
			trading_fee: 100_000n,
			fee_incentive_subsidy: 20_000n,
			builder_fee: 0n,
			penalty_fee: 7_000n,
			inventory_impact_charge: 3_000n,
			all_in_cost: 4_090_000n,
		},
		redeemQuote: {
			close_quantity: 2_000_000n,
			probability: 400_000_000n,
			proceeds: 790_000n,
			trading_fee: 10_000n,
			builder_fee: 0n,
			inventory_impact_rebate: 0n,
		},
		tickSizeRaw: 10_000_000n,
		missingObjects: new Set(),
		anonymousPricePerContract: 420_000_000n,
		...overrides,
	};
}

// A pure u64 argument of one move call.
function pureU64(tx: Transaction, cmdIdx: number, argIdx: number): bigint {
	const call = tx.getData().commands[cmdIdx].MoveCall!;
	const arg = call.arguments[argIdx] as { $kind: string; Input: number };
	const pure = tx.getData().inputs[arg.Input].Pure!.bytes;
	return BigInt(bcs.u64().parse(Buffer.from(pure, 'base64')));
}

function moduleOf(tx: Transaction, cmdIdx: number): string {
	return tx.getData().commands[cmdIdx].MoveCall!.module;
}

// The value one queue-read command returns, by its Move function name.
function returnsFor(fn: string, s: QueueScenario, tx: Transaction, cmdIdx: number): Uint8Array[] {
	switch (fn) {
		case 'expiry':
			return [u64(s.expiryMs)];
		case 'mint_paused':
			return [bool(s.mintPaused)];
		case 'cash_balance':
			return [u64(s.cashBalance)];
		case 'required_cash':
			return [u64(s.requiredCash)];
		case 'order_flow_state':
			return [u64(s.waitingCashNeed), u64(12n), u64(s.minEntryProbability)];
		case 'backing_buffer_lambda':
			return [u64(s.backingBufferLambda)];
		case 'queue_stuck':
			return [bool(s.stuck)];
		case 'waiting_cohorts':
			return [u64(1n), optU64(s.heads[2]), optU64(null)];
		case 'queue_heads':
			return s.heads.map(u64);
		case 'pending_counts':
			return s.pending.map(u64);
		case 'payout_progress':
			return [u64(0n), u64(s.heads[1]), bool(s.payoutCompleted)];
		case 'policy':
			return [DelayedExecutionPolicy.serialize(s.policy).toBytes()];
		case 'no_trade_window_ms':
			return [u64(s.noTradeWindowMs)];
		case 'fee_incentive_subsidy_rate':
			return [u64(s.subsidyRate)];
		case 'trading_paused':
			return [bool(s.tradingPaused)];
		case 'frozen':
			return [bool(s.frozen)];
		case 'version_watermark':
			// Predict's `protocol_config` and the companion's `desk` both have one.
			return [u64(moduleOf(tx, cmdIdx) === 'desk' ? s.deskWatermark : s.watermark)];
		case 'is_order_flow':
			return [bool(s.orderFlowEnabled)];
		case 'waiting_orders':
			return [u64(s.waitingOrders)];
		case 'load_account':
		case 'load_live_pricer':
			return [new Uint8Array(0)];
		case 'balance':
			return [u64(s.available)];
		case 'order': {
			const call = tx.getData().commands[cmdIdx].MoveCall!;
			const arg = call.arguments[1] as { $kind: string; Input: number };
			const pure = tx.getData().inputs[arg.Input].Pure!.bytes;
			const recordId = BigInt(bcs.u64().parse(Buffer.from(pure, 'base64')));
			const record = s.records.get(recordId) ?? null;
			return [bcs.option(OrderView).serialize(record).toBytes()];
		}
		case 'quote_mint_for_account':
		case 'quote_mint_exact_cost_for_account':
			return [expiryMarket.MintQuote.serialize(s.mintQuote).toBytes()];
		case 'quote_mint': {
			// Arguments: market, config, pricer, lower, higher, max_premium, min_quantity, exact.
			const quantity = pureU64(tx, cmdIdx, 6);
			const cost = (quantity * s.anonymousPricePerContract) / 1_000_000_000n;
			return [
				expiryMarket.MintQuote.serialize({
					...s.mintQuote,
					quantity,
					premium: (quantity * s.mintQuote.entry_probability) / 1_000_000_000n,
					builder_fee: 0n,
					penalty_fee: 0n,
					all_in_cost: cost,
				}).toBytes(),
			];
		}
		case 'quote_redeem_open':
			return [expiryMarket.RedeemQuote.serialize(s.redeemQuote).toBytes()];
		case 'tick_size':
			return [u64(s.tickSizeRaw)];
		case 'admission_tick_size':
			return [u64(s.tickSizeRaw)];
		case 'reference_tick':
			return [optU64(10_500_000n)];
		case 'expiry_market_id':
			return [
				bcs
					.option(bcs.Address)
					.serialize('0x' + 'cd'.repeat(32))
					.toBytes(),
			];
		default:
			throw new Error(`queueClient: no canned return for ${fn}`);
	}
}

/**
 * A mock client serving a {@link QueueScenario}: every simulated command gets the canned return
 * for its function. Records every simulated PTB in `simulated`, so a test can assert the reads.
 */
export function queueClient(s: QueueScenario) {
	const simulated: Transaction[] = [];
	const existenceChecks: string[] = [];
	const client = {
		core: {
			async simulateTransaction(opts: { transaction: Transaction }) {
				simulated.push(opts.transaction);
				const cmds = opts.transaction.getData().commands;
				return {
					$kind: 'Transaction',
					Transaction: {},
					commandResults: cmds.map((c, i) => ({
						returnValues: returnsFor(c.MoveCall!.function, s, opts.transaction, i).map((b) => ({
							bcs: b,
						})),
						mutatedReferences: [],
					})),
				};
			},
			async getObject() {
				throw new Error('queueClient: getObject not mocked');
			},
			// The facade's queue and account existence checks read objects.
			async getObjects(opts: { objectIds: string[] }) {
				existenceChecks.push(...opts.objectIds);
				return {
					objects: opts.objectIds.map((objectId) =>
						s.missingObjects.has(objectId) || !s.queueExists
							? new Error(`object ${objectId} not found`)
							: { objectId },
					),
				};
			},
		},
	} as unknown as ReadClient;
	return { client, simulated, existenceChecks };
}

/** The `module::function` of every move call, in order. */
export function moveCallTargets(tx: Transaction): string[] {
	return tx
		.getData()
		.commands.flatMap((c) =>
			'MoveCall' in c && c.MoveCall ? [`${c.MoveCall.module}::${c.MoveCall.function}`] : [],
		);
}
