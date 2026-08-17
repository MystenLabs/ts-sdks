import { fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import type { PredictConfig } from './config/index.js';
import { accountEvents } from '@mysten/deepbook-account';
import * as builderCodeEvents from './contracts/deepbook_predict/builder_code_events.js';
import * as orderEvents from './contracts/deepbook_predict/order_events.js';
import * as vaultEvents from './contracts/deepbook_predict/vault_events.js';
import { PredictInputError } from './errors.js';
import { fromRaw } from './units.js';

// ============================================================================
// Execution-result decoders.
//
// Every tx.* builder returns a Transaction; after the app executes it (with
// events included), the deployed contracts emit typed events carrying the full
// receipt — order ids, fills, fees, queue indexes, new balances. These pure
// functions turn that result into typed receipts. No network, no client.
//
// Decoding uses each event's BCS bytes, not its `json`: the client typings
// warn the JSON rendering varies across transports (JSON-RPC/gRPC/GraphQL),
// while BCS is canonical. Layouts come from the GENERATED event MoveStructs
// (src/contracts/{deepbook_predict,account}/*_events.ts), whose field order
// mirrors the deployed Move — regenerate the bindings if the package changes.
// ============================================================================

/** The slice of an executed/simulated transaction result the decoders need. */
export interface DecodableEvent {
	/** Full type tag `0xpkg::module::Name` (gRPC `eventType`, legacy `type`). */
	eventType?: string;
	type?: string;
	packageId?: string;
	module?: string;
	/** Canonical BCS payload; some transports deliver it base64-encoded. */
	bcs?: Uint8Array | string;
}

export interface DecodableTransactionResult {
	events?: readonly DecodableEvent[] | null;
}

// --- matching + plumbing ----------------------------------------------------

function eventBytes(e: DecodableEvent): Uint8Array | null {
	if (e.bcs instanceof Uint8Array) return e.bcs;
	if (typeof e.bcs === 'string') return fromBase64(e.bcs);
	return null;
}

// Match by defining package + module + struct name. Events are typed by the
// ORIGINAL package id; for the current v1 deployments that equals the config
// package id.
function matches(e: DecodableEvent, pkg: string, module: string, name: string): boolean {
	const tag = e.eventType ?? e.type;
	if (tag) {
		const parts = tag.split('::');
		if (parts.length !== 3) return false;
		return (
			normalizeSuiAddress(parts[0]) === normalizeSuiAddress(pkg) &&
			parts[1] === module &&
			parts[2] === name
		);
	}
	return e.module === module && e.packageId != null
		? normalizeSuiAddress(e.packageId) === normalizeSuiAddress(pkg)
		: false;
}

function decodeAll<T>(
	result: DecodableTransactionResult,
	pkg: string,
	module: string,
	name: string,
	layout: { parse(bytes: Uint8Array): T },
): T[] {
	const out: T[] = [];
	for (const e of result.events ?? []) {
		if (!matches(e, pkg, module, name)) continue;
		const bytes = eventBytes(e);
		if (!bytes) {
			throw new PredictInputError(
				`${module}::${name} event has no BCS payload — execute/simulate with events included`,
			);
		}
		out.push(layout.parse(bytes));
	}
	return out;
}

function exactlyOne<T>(items: T[], what: string): T {
	if (items.length !== 1) {
		throw new PredictInputError(`expected exactly one ${what} event, found ${items.length}`);
	}
	return items[0];
}

const optId = (v: string | null | undefined): string | null =>
	v == null ? null : normalizeSuiAddress(v);

// --- receipts ---------------------------------------------------------------

export interface MintReceipt {
	marketId: string;
	accountId: string;
	owner: string;
	/** Persist this: required to redeem/claim the position later. */
	orderId: bigint;
	/** Stable across partial-close replacements; equals orderId at mint. */
	positionRootId: bigint;
	lowerTick: bigint;
	higherTick: bigint;
	leverage: number;
	/** 0..1 range probability quoted at entry (your fill price per $1 payout). */
	entryProbability: number;
	/** Max payout actually minted, in quote units (mintAmount: chain-floored). */
	quantity: number;
	/** Net premium paid into LP backing, in quote units. */
	netPremium: number;
	fees: { trading: number; subsidy: number; builder: number; penalty: number };
	builderCodeId: string | null;
	raw: {
		quantity: bigint;
		netPremium: bigint;
		tradingFee: bigint;
		feeIncentiveSubsidy: bigint;
		builderFee: bigint;
		penaltyFee: bigint;
		leverage: bigint;
		entryProbability: bigint;
	};
}

export interface RedeemReceipt {
	marketId: string;
	accountId: string;
	owner: string;
	orderId: bigint;
	positionRootId: bigint;
	quantityClosed: number;
	remaining: number;
	/**
	 * A partial close RETIRES the old order id and issues this replacement for
	 * the remaining quantity — update your stored id or it goes silently stale.
	 */
	replacementOrderId: bigint | null;
	/** NET quote credited to the account: gross − trading − builder − penalty
	 * (verified against the deployed settle path; 0 for a liquidated tombstone). */
	proceeds: number;
	/** Gross close value before fees (the event's redeem_amount). */
	gross: number;
	liquidated: boolean;
	fees: { trading: number; builder: number; penalty: number };
	builderCodeId: string | null;
	raw: {
		quantityClosed: bigint;
		remaining: bigint;
		proceeds: bigint;
		gross: bigint;
		tradingFee: bigint;
		builderFee: bigint;
		penaltyFee: bigint;
	};
}

export interface ClaimReceipt {
	marketId: string;
	accountId: string;
	owner: string;
	orderId: bigint;
	positionRootId: bigint;
	quantityClosed: number;
	/** Settlement price in USD. */
	settlementPrice: number;
	/** Quote units paid out. */
	payout: number;
	raw: { quantityClosed: bigint; settlementPrice: bigint; payout: bigint };
}

export interface CreateManagerReceipt {
	accountId: string;
	wrapperId: string;
	owner: string;
	selfOwned: boolean;
}

export interface BalanceChangeReceipt {
	accountId: string;
	coinType: string;
	/** Display value assuming a 6-decimal coin (quote + PLP both are). */
	amount: number;
	newBalance: number;
	raw: { amount: bigint; newBalance: bigint };
}

export interface PlpRequestReceipt {
	kind: 'supply' | 'withdraw';
	vaultId: string;
	accountId: string;
	recipient: string;
	/** Feed straight into cancelSupplyPlp / cancelWithdrawPlp. */
	index: bigint;
	/** Quote units for supply; PLP shares (6-dec) for withdraw. */
	amount: number;
	raw: { amount: bigint };
}

export interface PlpCancelReceipt {
	vaultId: string;
	accountId: string;
	recipient: string;
	index: bigint;
	isSupply: boolean;
	/** Refund returned to the account (quote for supply, PLP for withdraw). */
	amount: number;
	raw: { amount: bigint };
}

export interface BuilderCodeReceipt {
	accountId: string;
	owner: string;
	/** Null after unsetBuilderCode. */
	builderCodeId: string | null;
}

// --- decoders (plural = all matching events, in event order) ----------------

export function decodeMints(cfg: PredictConfig, result: DecodableTransactionResult): MintReceipt[] {
	return decodeAll(
		result,
		cfg.packages.predict,
		'order_events',
		'OrderMinted',
		orderEvents.OrderMinted,
	).map((e) => ({
		marketId: normalizeSuiAddress(e.expiry_market_id),
		accountId: normalizeSuiAddress(e.account_id),
		owner: normalizeSuiAddress(e.owner),
		orderId: e.order_id,
		positionRootId: e.position_root_id,
		lowerTick: e.lower_tick,
		higherTick: e.higher_tick,
		leverage: fromRaw(e.leverage, 9),
		entryProbability: fromRaw(e.entry_probability, 9),
		quantity: fromRaw(e.quantity, 6),
		netPremium: fromRaw(e.net_premium, 6),
		fees: {
			trading: fromRaw(e.trading_fee, 6),
			subsidy: fromRaw(e.fee_incentive_subsidy, 6),
			builder: fromRaw(e.builder_fee, 6),
			penalty: fromRaw(e.penalty_fee, 6),
		},
		builderCodeId: optId(e.builder_code_id),
		raw: {
			quantity: e.quantity,
			netPremium: e.net_premium,
			tradingFee: e.trading_fee,
			feeIncentiveSubsidy: e.fee_incentive_subsidy,
			builderFee: e.builder_fee,
			penaltyFee: e.penalty_fee,
			leverage: e.leverage,
			entryProbability: e.entry_probability,
		},
	}));
}

export function decodeRedeems(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): RedeemReceipt[] {
	const pkg = cfg.packages.predict;
	const live = decodeAll(
		result,
		pkg,
		'order_events',
		'LiveOrderRedeemed',
		orderEvents.LiveOrderRedeemed,
	).map(
		(e): RedeemReceipt => ({
			marketId: normalizeSuiAddress(e.expiry_market_id),
			accountId: normalizeSuiAddress(e.account_id),
			owner: normalizeSuiAddress(e.owner),
			orderId: e.order_id,
			positionRootId: e.position_root_id,
			quantityClosed: fromRaw(e.quantity_closed, 6),
			remaining: fromRaw(e.remaining_quantity, 6),
			replacementOrderId: e.replacement_order_id,
			// settle_live_redeem_payment credits redeem_amount minus all three
			// fee components — the event's redeem_amount is GROSS.
			proceeds: fromRaw(e.redeem_amount - e.trading_fee - e.builder_fee - e.penalty_fee, 6),
			gross: fromRaw(e.redeem_amount, 6),
			liquidated: false,
			fees: {
				trading: fromRaw(e.trading_fee, 6),
				builder: fromRaw(e.builder_fee, 6),
				penalty: fromRaw(e.penalty_fee, 6),
			},
			builderCodeId: optId(e.builder_code_id),
			raw: {
				quantityClosed: e.quantity_closed,
				remaining: e.remaining_quantity,
				proceeds: e.redeem_amount - e.trading_fee - e.builder_fee - e.penalty_fee,
				gross: e.redeem_amount,
				tradingFee: e.trading_fee,
				builderFee: e.builder_fee,
				penaltyFee: e.penalty_fee,
			},
		}),
	);
	const liquidated = decodeAll(
		result,
		pkg,
		'order_events',
		'LiquidatedOrderRedeemed',
		orderEvents.LiquidatedOrderRedeemed,
	).map(
		(e): RedeemReceipt => ({
			marketId: normalizeSuiAddress(e.expiry_market_id),
			accountId: normalizeSuiAddress(e.account_id),
			owner: normalizeSuiAddress(e.owner),
			orderId: e.order_id,
			positionRootId: e.position_root_id,
			quantityClosed: fromRaw(e.quantity_closed, 6),
			remaining: 0,
			replacementOrderId: null,
			proceeds: 0,
			gross: 0,
			liquidated: true,
			fees: { trading: 0, builder: 0, penalty: 0 },
			builderCodeId: null,
			raw: {
				quantityClosed: e.quantity_closed,
				remaining: 0n,
				proceeds: 0n,
				gross: 0n,
				tradingFee: 0n,
				builderFee: 0n,
				penaltyFee: 0n,
			},
		}),
	);
	return [...live, ...liquidated];
}

export function decodeClaims(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): ClaimReceipt[] {
	return decodeAll(
		result,
		cfg.packages.predict,
		'order_events',
		'SettledOrderRedeemed',
		orderEvents.SettledOrderRedeemed,
	).map((e) => ({
		marketId: normalizeSuiAddress(e.expiry_market_id),
		accountId: normalizeSuiAddress(e.account_id),
		owner: normalizeSuiAddress(e.owner),
		orderId: e.order_id,
		positionRootId: e.position_root_id,
		quantityClosed: fromRaw(e.quantity_closed, 6),
		settlementPrice: fromRaw(e.settlement_price, 9),
		payout: fromRaw(e.payout_amount, 6),
		raw: {
			quantityClosed: e.quantity_closed,
			settlementPrice: e.settlement_price,
			payout: e.payout_amount,
		},
	}));
}

export function decodeAccountsCreated(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): CreateManagerReceipt[] {
	return decodeAll(
		result,
		cfg.packages.account,
		'account_events',
		'AccountCreated',
		accountEvents.AccountCreated,
	).map((e) => ({
		accountId: normalizeSuiAddress(e.account_id),
		wrapperId: normalizeSuiAddress(e.wrapper_id),
		owner: normalizeSuiAddress(e.owner),
		selfOwned: e.self_owned,
	}));
}

function decodeBalanceChanges(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
	name: 'Deposited' | 'Withdrawn',
): BalanceChangeReceipt[] {
	const layout = name === 'Deposited' ? accountEvents.Deposited : accountEvents.Withdrawn;
	return decodeAll(result, cfg.packages.account, 'account_events', name, layout).map((e) => ({
		accountId: normalizeSuiAddress(e.account_id),
		coinType: e.coin_type,
		amount: fromRaw(e.amount, 6),
		newBalance: fromRaw(e.new_balance, 6),
		raw: { amount: e.amount, newBalance: e.new_balance },
	}));
}

export const decodeDeposits = (
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): BalanceChangeReceipt[] => decodeBalanceChanges(cfg, result, 'Deposited');

export const decodeWithdrawals = (
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): BalanceChangeReceipt[] => decodeBalanceChanges(cfg, result, 'Withdrawn');

export function decodePlpRequests(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): PlpRequestReceipt[] {
	const pkg = cfg.packages.predict;
	// Supply/WithdrawRequested differ only in their min-out field (unused here);
	// pick the fields both share so either generated struct's parse feeds `make`.
	type RequestedCommon = Pick<
		(typeof vaultEvents.SupplyRequested)['$inferType'],
		'pool_vault_id' | 'account_id' | 'recipient' | 'index' | 'amount'
	>;
	const make =
		(kind: 'supply' | 'withdraw') =>
		(e: RequestedCommon): PlpRequestReceipt => ({
			kind,
			vaultId: normalizeSuiAddress(e.pool_vault_id),
			accountId: normalizeSuiAddress(e.account_id),
			recipient: normalizeSuiAddress(e.recipient),
			index: e.index,
			amount: fromRaw(e.amount, 6),
			raw: { amount: e.amount },
		});
	return [
		...decodeAll(result, pkg, 'vault_events', 'SupplyRequested', vaultEvents.SupplyRequested).map(
			make('supply'),
		),
		...decodeAll(
			result,
			pkg,
			'vault_events',
			'WithdrawRequested',
			vaultEvents.WithdrawRequested,
		).map(make('withdraw')),
	];
}

export function decodePlpCancels(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): PlpCancelReceipt[] {
	return decodeAll(
		result,
		cfg.packages.predict,
		'vault_events',
		'RequestCancelled',
		vaultEvents.RequestCancelled,
	).map((e) => ({
		vaultId: normalizeSuiAddress(e.pool_vault_id),
		accountId: normalizeSuiAddress(e.account_id),
		recipient: normalizeSuiAddress(e.recipient),
		index: e.index,
		isSupply: e.is_supply,
		amount: fromRaw(e.amount, 6),
		raw: { amount: e.amount },
	}));
}

export function decodeBuilderCodeSets(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): BuilderCodeReceipt[] {
	return decodeAll(
		result,
		cfg.packages.predict,
		'builder_code_events',
		'BuilderCodeSet',
		builderCodeEvents.BuilderCodeSet,
	).map((e) => ({
		accountId: normalizeSuiAddress(e.account_id),
		owner: normalizeSuiAddress(e.owner),
		builderCodeId: optId(e.builder_code_id),
	}));
}

export { exactlyOne };
