import { toBase64 } from '@mysten/sui/utils';
import { describe, expect, test } from 'vitest';
import { TESTNET_CONFIG as cfg } from '../../src/predict/config/index.js';
import {
	decodeAccountsCreated,
	decodeClaims,
	decodeDeposits,
	decodeMints,
	decodePlpCancels,
	decodePlpRequests,
	decodeRedeems,
	type DecodableEvent,
} from '../../src/predict/decode.js';
import { accountEvents } from '../../src/account.js';
import * as orderEvents from '../../src/contracts/deepbook_predict/order_events.js';
import * as vaultEvents from '../../src/contracts/deepbook_predict/vault_events.js';
import { PredictClient } from '../../src/predict/client.js';
import { PredictInputError } from '../../src/predict/errors.js';

// Fixtures serialize with the GENERATED event MoveStructs (src/contracts/...) —
// the exact layouts decode.ts now parses, so a fixture can't drift from the
// deployed struct order. Assertions cover the receipt fields the decoders
// expose; trailing on-chain fields the receipts don't surface get placeholders.

const MARKET = '0x' + '11'.repeat(32);
const ACCOUNT = '0x' + '22'.repeat(32);
const OWNER = '0x' + '33'.repeat(32);
const VAULT = '0x' + '44'.repeat(32);
const CODE = '0x' + '55'.repeat(32);

function mintedEvent(orderId: bigint, overrides: Record<string, unknown> = {}): DecodableEvent {
	return {
		eventType: `${cfg.packages.predict}::order_events::OrderMinted`,
		bcs: orderEvents.OrderMinted.serialize({
			expiry_market_id: MARKET,
			account_id: ACCOUNT,
			order_id: orderId,
			position_root_id: orderId,
			owner: OWNER,
			lower_tick: 10_500_000n,
			higher_tick: (1n << 30n) - 1n,
			entry_probability: 300_000_000n,
			quantity: 50_000_000n,
			premium: 12_500_000n,
			trading_fee: 100_000n,
			fee_incentive_subsidy: 20_000n,
			builder_fee: 30_000n,
			penalty_fee: 5_000n,
			referral_fee: 7_000n,
			inventory_impact_charge: 4_000n,
			builder_code_id: CODE,
			referrer_account_id: null,
			// Trailing fields decode.ts parses but the mint receipt does not surface.
			onchain_timestamp_ms: 0n,
			pyth_spot_source_timestamp_ms: 0n,
			block_scholes_spot_source_timestamp_ms: 0n,
			block_scholes_forward_source_timestamp_ms: 0n,
			block_scholes_svi_source_timestamp_ms: 0n,
			...overrides,
		}).toBytes(),
	};
}

describe('decodeMints', () => {
	test('full receipt with human + raw units', () => {
		const [r] = decodeMints(cfg, { events: [mintedEvent(7n)] });
		expect(r.orderId).toBe(7n);
		expect(r.positionRootId).toBe(7n);
		expect(r.marketId).toBe(MARKET);
		expect(r.quantity).toBe(50); // $50 payout
		expect(r.premium).toBe(12.5);
		expect(r.entryProbability).toBeCloseTo(0.3);
		expect(r.fees).toEqual({
			trading: 0.1,
			subsidy: 0.02,
			builder: 0.03,
			penalty: 0.005,
			referral: 0.007,
			inventoryImpact: 0.004,
		});
		expect(r.builderCodeId).toBe(CODE);
		expect(r.raw.quantity).toBe(50_000_000n);
		expect(r.raw.premium).toBe(12_500_000n);
	});

	test('batched PTB: N mints → N receipts, in order', () => {
		const receipts = decodeMints(cfg, { events: [mintedEvent(1n), mintedEvent(2n)] });
		expect(receipts.map((r) => r.orderId)).toEqual([1n, 2n]);
	});

	test('accepts base64-encoded bcs payloads', () => {
		const e = mintedEvent(9n);
		const [r] = decodeMints(cfg, {
			events: [{ ...e, bcs: toBase64(e.bcs as Uint8Array) }],
		});
		expect(r.orderId).toBe(9n);
	});

	test('None builder code → null', () => {
		const [r] = decodeMints(cfg, { events: [mintedEvent(1n, { builder_code_id: null })] });
		expect(r.builderCodeId).toBeNull();
	});

	test('foreign events are ignored', () => {
		const wrongPkg = {
			...mintedEvent(1n),
			eventType: `0x${'aa'.repeat(32)}::order_events::OrderMinted`,
		};
		const wrongName = {
			...mintedEvent(1n),
			eventType: `${cfg.packages.predict}::order_events::SomethingElse`,
		};
		expect(decodeMints(cfg, { events: [wrongPkg, wrongName] })).toEqual([]);
	});

	test('facade singular: throws unless exactly one', () => {
		const pc = new PredictClient({
			network: 'testnet',
			client: { simulateTransaction: async () => ({}) } as never,
		});
		expect(() => pc.decode.mint({ events: [] })).toThrow(PredictInputError);
		expect(() => pc.decode.mint({ events: [mintedEvent(1n), mintedEvent(2n)] })).toThrow(/found 2/);
		expect(pc.decode.mint({ events: [mintedEvent(3n)] }).orderId).toBe(3n);
	});
});

describe('decodeRedeems', () => {
	function liveRedeem(replacement: bigint | null): DecodableEvent {
		return {
			eventType: `${cfg.packages.predict}::order_events::LiveOrderRedeemed`,
			bcs: orderEvents.LiveOrderRedeemed.serialize({
				expiry_market_id: MARKET,
				account_id: ACCOUNT,
				order_id: 7n,
				position_root_id: 7n,
				owner: OWNER,
				quantity_closed: 20_000_000n,
				remaining_quantity: replacement == null ? 0n : 30_000_000n,
				replacement_order_id: replacement,
				redeem_amount: 6_000_000n,
				trading_fee: 50_000n,
				builder_fee: 0n,
				penalty_fee: 0n,
				inventory_impact_rebate: 3_000n,
				builder_code_id: null,
				// Trailing fields decode.ts parses but the redeem receipt does not surface.
				onchain_timestamp_ms: 0n,
				pyth_spot_source_timestamp_ms: 0n,
				block_scholes_spot_source_timestamp_ms: 0n,
				block_scholes_forward_source_timestamp_ms: 0n,
				block_scholes_svi_source_timestamp_ms: 0n,
			}).toBytes(),
		};
	}

	test('partial close surfaces the replacement order id and NET proceeds', () => {
		const [r] = decodeRedeems(cfg, { events: [liveRedeem(8n)] });
		expect(r.replacementOrderId).toBe(8n);
		expect(r.remaining).toBe(30);
		// redeem_amount 6.0 is GROSS; net = gross − trading (0.05) − builder − penalty
		expect(r.gross).toBe(6);
		expect(r.proceeds).toBe(5.953); // gross 6 + rebate 0.003 − trading 0.05
		expect(r.raw.proceeds).toBe(5_953_000n);
		expect(r.fees.inventoryImpactRebate).toBe(0.003);
	});

	test('full close → replacement null', () => {
		const [r] = decodeRedeems(cfg, { events: [liveRedeem(null)] });
		expect(r.replacementOrderId).toBeNull();
		expect(r.remaining).toBe(0);
	});
});

describe('other decoders', () => {
	test('claim receipt', () => {
		const [r] = decodeClaims(cfg, {
			events: [
				{
					eventType: `${cfg.packages.predict}::order_events::SettledOrderRedeemed`,
					bcs: orderEvents.SettledOrderRedeemed.serialize({
						expiry_market_id: MARKET,
						account_id: ACCOUNT,
						order_id: 7n,
						position_root_id: 7n,
						owner: OWNER,
						payout_amount: 50_000_000n,
						onchain_timestamp_ms: 0n,
					}).toBytes(),
				},
			],
		});
		expect(r.payout).toBe(50);
	});

	test('createManager receipt', () => {
		const [r] = decodeAccountsCreated(cfg, {
			events: [
				{
					eventType: `${cfg.packages.account}::account_events::AccountCreated`,
					bcs: accountEvents.AccountCreated.serialize({
						account_id: ACCOUNT,
						wrapper_id: VAULT,
						owner: OWNER,
						self_owned: true,
						// DBU-666 trailing field; the receipt does not surface it.
						referrer_account_id: null,
					}).toBytes(),
				},
			],
		});
		expect(r).toEqual({ accountId: ACCOUNT, wrapperId: VAULT, owner: OWNER, selfOwned: true });
	});

	test('deposit receipt carries new balance', () => {
		const [r] = decodeDeposits(cfg, {
			events: [
				{
					eventType: `${cfg.packages.account}::account_events::Deposited`,
					bcs: accountEvents.Deposited.serialize({
						account_id: ACCOUNT,
						coin_type: cfg.quoteCoinType.slice(2),
						amount: 250_000_000n,
						new_balance: 1_000_000_000n,
					}).toBytes(),
				},
			],
		});
		expect(r.amount).toBe(250);
		expect(r.newBalance).toBe(1000);
	});

	test('plp request receipt yields the cancel index', () => {
		const [r] = decodePlpRequests(cfg, {
			events: [
				{
					eventType: `${cfg.packages.predict}::vault_events::SupplyRequested`,
					bcs: vaultEvents.SupplyRequested.serialize({
						pool_vault_id: VAULT,
						account_id: ACCOUNT,
						recipient: OWNER,
						index: 42n,
						amount: 100_000_000n,
						// Trailing fields the request receipt does not surface.
						min_plp_out: 0n,
						requests_pending_after: 0n,
					}).toBytes(),
				},
			],
		});
		expect(r.kind).toBe('supply');
		expect(r.index).toBe(42n);
		expect(r.amount).toBe(100);
	});

	test('plp cancel receipt', () => {
		const [r] = decodePlpCancels(cfg, {
			events: [
				{
					eventType: `${cfg.packages.predict}::vault_events::RequestCancelled`,
					bcs: vaultEvents.RequestCancelled.serialize({
						pool_vault_id: VAULT,
						account_id: ACCOUNT,
						recipient: OWNER,
						index: 42n,
						amount: 100_000_000n,
						is_supply: true,
						// Trailing fields the cancel receipt does not surface.
						reason: 0,
						requests_pending_after: 0n,
					}).toBytes(),
				},
			],
		});
		expect(r.index).toBe(42n);
		expect(r.isSupply).toBe(true);
	});

	test('missing bcs payload → descriptive error', () => {
		expect(() =>
			decodeMints(cfg, {
				events: [{ eventType: `${cfg.packages.predict}::order_events::OrderMinted` }],
			}),
		).toThrow(/events included/);
	});
});
