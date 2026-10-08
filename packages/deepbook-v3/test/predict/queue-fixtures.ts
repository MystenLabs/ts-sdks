// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Shared fixtures for the delayed-execution (DBU-885) tests: queue records, policies and a mock
// client that answers the queue reads by the Move functions in each simulated PTB. Records and
// policies serialize with the GENERATED layouts, so a fixture can't drift from the Move structs.
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { DelayedExecutionPolicy } from '../../src/contracts/deepbook_predict/delayed_execution_config.js';
import * as expiryMarket from '../../src/contracts/deepbook_predict/expiry_market.js';
import { QueuedOrder } from '../../src/contracts/deepbook_predict/order_queue.js';
import { TESTNET_CONFIG } from '../../src/predict/config/index.js';
import type { PredictConfig } from '../../src/predict/config/index.js';
import type { ReadClient } from '../../src/predict/reads/inspect.js';

/** A stand-in for the delayed-execution package: any id distinct from the v1 origin works. */
export const DELAYED_PKG = '0x' + 'de'.repeat(32);

/** Testnet's ids with delayed execution recorded, as a localnet `config` would carry it. */
export const QUEUE_CFG: PredictConfig = {
	...TESTNET_CONFIG,
	packages: { ...TESTNET_CONFIG.packages, predictDelayedExecution: DELAYED_PKG },
	oracle: { pythLazerState: '0x' + '1a'.repeat(32) },
};

export type PolicyFields = (typeof DelayedExecutionPolicy)['$inferType'];
export type RecordFields = (typeof QueuedOrder)['$inferType'];

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

const ZERO = '0x' + '00'.repeat(32);
const I64_ZERO = { magnitude: 0n, is_negative: false };

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
		parties: {
			account_id: overrides.accountId ?? '0x' + '22'.repeat(32),
			owner: '0x' + '33'.repeat(32),
			receive_address: '0x' + '44'.repeat(32),
			referrer_account_id: null,
			referrer_receive_address: null,
			builder_code_id: null,
		},
		timing: {
			placed_at_ms: 1_000_000n,
			earliest_price_ms: 1_000_800n,
			tau_ms: 1_000_800n,
			deadline_ms: 1_005_800n,
			cutoff_ms: 2_000_000n,
			pyth_channel: 3,
			...overrides.timing,
		},
		vol: {
			pyth_source_id: 1,
			bs_spot: 0n,
			bs_forward: 0n,
			svi_a: I64_ZERO,
			svi_b: 0n,
			svi_rho: I64_ZERO,
			svi_m: I64_ZERO,
			svi_sigma: 0n,
			bs_spot_source_timestamp_ms: 0n,
			bs_forward_source_timestamp_ms: 0n,
			svi_source_timestamp_ms: 0n,
		},
		escrow: {
			budget: 6_000_000n,
			order_fee: 20_000n,
			subsidy_bound: 0n,
			subsidy_rate: 0n,
			subsidy_reserved: 0n,
			cash_need: 9_900_001n,
		},
		position: { order_id: 0n, root_id: 0n, opened_at_ms: 0n, ...overrides.position },
		price: { spot: 0n, tick_ms: 0n, generation_us: 0n, ...overrides.price },
		result: { reason: 0, quantity: 0n, amount: 0n, finished_at_ms: 0n, ...overrides.result },
	};
}

export const ZERO_ADDRESS = ZERO;

const u64 = (v: bigint) => bcs.u64().serialize(v).toBytes();
const bool = (v: boolean) => bcs.bool().serialize(v).toBytes();
const optU64 = (v: bigint | null) => bcs.option(bcs.u64()).serialize(v).toBytes();

/** The chain state a {@link queueClient} serves. Every field has a passing default. */
export interface QueueScenario {
	expiryMs: bigint;
	mintPaused: boolean;
	cashBalance: bigint;
	requiredCash: bigint;
	spareCash: bigint;
	waitingCashNeed: bigint;
	minEntryProbability: bigint;
	backingBufferLambda: bigint;
	stuck: boolean;
	heads: [bigint, bigint, bigint, bigint];
	pending: [bigint, bigint];
	policy: PolicyFields | null;
	noTradeWindowMs: bigint;
	subsidyRate: bigint;
	tradingPaused: boolean;
	frozen: boolean;
	watermark: bigint;
	waitingOrders: bigint;
	available: bigint;
	records: Map<bigint, RecordFields>;
	mintQuote: (typeof expiryMarket.MintQuote)['$inferType'];
	redeemQuote: (typeof expiryMarket.RedeemQuote)['$inferType'];
	tickSizeRaw: bigint;
}

export function scenario(overrides: Partial<QueueScenario> = {}): QueueScenario {
	return {
		expiryMs: BigInt(Date.now()) + 3_600_000n,
		mintPaused: false,
		cashBalance: 1_000_000_000n,
		requiredCash: 500_000_000n,
		spareCash: 500_000_000n,
		waitingCashNeed: 0n,
		minEntryProbability: 10_000_000n,
		backingBufferLambda: 310_000_000n,
		stuck: false,
		heads: [0n, 0n, 0n, 0n],
		pending: [0n, 0n],
		policy: policyFields(),
		noTradeWindowMs: 10_000n,
		subsidyRate: 200_000_000n,
		tradingPaused: false,
		frozen: false,
		watermark: 4n,
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
		...overrides,
	};
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
		case 'spare_cash':
			return [u64(s.spareCash)];
		case 'waiting_cash_need':
			return [u64(s.waitingCashNeed)];
		case 'min_entry_probability':
			return [u64(s.minEntryProbability)];
		case 'backing_buffer_lambda':
			return [u64(s.backingBufferLambda)];
		case 'payout_tree_node_count':
			return [u64(12n)];
		case 'queue_stuck':
			return [bool(s.stuck)];
		case 'waiting_cohorts':
			return [u64(1n), optU64(s.heads[2]), optU64(null)];
		case 'queue_heads':
			return s.heads.map(u64);
		case 'pending_counts':
			return s.pending.map(u64);
		case 'payout_progress':
			return [u64(0n), u64(s.heads[1])];
		case 'delayed_execution_policy':
			return [bcs.option(DelayedExecutionPolicy).serialize(s.policy).toBytes()];
		case 'no_trade_window_ms':
			return [u64(s.noTradeWindowMs)];
		case 'fee_incentive_subsidy_rate':
			return [u64(s.subsidyRate)];
		case 'trading_paused':
			return [bool(s.tradingPaused)];
		case 'frozen':
			return [bool(s.frozen)];
		case 'version_watermark':
			return [u64(s.watermark)];
		case 'waiting_orders':
			return [u64(s.waitingOrders)];
		case 'load_account':
		case 'load_live_pricer':
			return [new Uint8Array(0)];
		case 'balance':
			return [u64(s.available)];
		case 'queued_order': {
			const call = tx.getData().commands[cmdIdx].MoveCall!;
			const arg = call.arguments[1] as { $kind: string; Input: number };
			const pure = tx.getData().inputs[arg.Input].Pure!.bytes;
			const recordId = BigInt(bcs.u64().parse(Buffer.from(pure, 'base64')));
			const record = s.records.get(recordId) ?? null;
			return [bcs.option(QueuedOrder).serialize(record).toBytes()];
		}
		case 'quote_mint_for_account':
		case 'quote_mint_exact_cost_for_account':
			return [expiryMarket.MintQuote.serialize(s.mintQuote).toBytes()];
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
		},
	} as unknown as ReadClient;
	return { client, simulated };
}

/** The `module::function` of every move call, in order. */
export function moveCallTargets(tx: Transaction): string[] {
	return tx
		.getData()
		.commands.flatMap((c) =>
			'MoveCall' in c && c.MoveCall ? [`${c.MoveCall.module}::${c.MoveCall.function}`] : [],
		);
}
