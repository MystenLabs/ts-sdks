/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Predict's per-account state, stored as an app-data slot on a shared `Account`
 * (the `account` package).
 *
 * This is Predict's account-local state: open positions, per-expiry trading
 * summaries, DEEP stake, and sticky builder-code attribution. DUSDC/PLP/DEEP
 * custody lives in `Account`. The `PredictApp` witness namespaces this slot, so
 * only Predict writes it.
 *
 * Position, summary, and stake mutations are package-internal. Builder-code
 * configuration accepts an account `Auth`; the account package decides which owner
 * or authorized application may obtain that mutable borrow.
 */

import {
	MoveTuple,
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/deepbook_predict::predict_account';
export const PredictApp = new MoveTuple({
	name: `${$moduleName}::PredictApp`,
	fields: [bcs.bool()],
});
export const PositionKey = new MoveStruct({
	name: `${$moduleName}::PositionKey`,
	fields: {
		expiry_market_id: bcs.Address,
		order_id: bcs.u256(),
	},
});
export const Position = new MoveStruct({
	name: `${$moduleName}::Position`,
	fields: {
		/** Root order ID, carried forward unchanged across partial-close replacements. */
		root_id: bcs.u256(),
		/**
		 * On-chain time (`clock.timestamp_ms()`) the position was opened, carried forward
		 * unchanged across partial-close replacements. A live redeem in the same timestamp
		 * is rejected, blocking an atomic mint -> oracle-update -> redeem in one
		 * transaction.
		 */
		opened_at_ms: bcs.u64(),
	},
});
export const ExpiryTradingSummary = new MoveStruct({
	name: `${$moduleName}::ExpiryTradingSummary`,
	fields: {
		open_position_count: bcs.u64(),
		trading_fees_paid: bcs.u64(),
		gross_paid_to_expiry: bcs.u64(),
		gross_received_from_expiry: bcs.u64(),
	},
});
export const ResolvedExpirySummary = new MoveStruct({
	name: `${$moduleName}::ResolvedExpirySummary`,
	fields: {
		fees_paid: bcs.u64(),
		gross_profit: bcs.u64(),
	},
});
export const PredictData = new MoveStruct({
	name: `${$moduleName}::PredictData`,
	fields: {
		/** Open positions scoped by expiry market. */
		positions: table.Table,
		/** Per-expiry aggregate trading cash flows and open position count. */
		expiry_summaries: table.Table,
		/**
		 * DEEP staked and active for trading benefits, in raw units. Custody is pooled in
		 * `PoolVault`; this is this account's active share.
		 */
		active_stake: bcs.u64(),
		/**
		 * DEEP staked this epoch, not yet active; rolls into `active_stake` on the first
		 * discount-bearing interaction in a later epoch (`roll_active_stake`).
		 */
		inactive_stake: bcs.u64(),
		/** Epoch the active/inactive split was last reconciled in. */
		stake_epoch: bcs.u64(),
		/** Sticky builder-code attribution for future trades, if set. */
		builder_code_id: bcs.option(bcs.Address),
	},
});
export interface HasPositionArguments {
	account: TransactionArgument;
	expiryMarketId: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
}
export interface HasPositionOptions {
	package?: string;
	arguments:
		| HasPositionArguments
		| [
				account: TransactionArgument,
				expiryMarketId: RawTransactionArgument<string>,
				orderId: RawTransactionArgument<number | bigint>,
		  ];
}
/** Return whether an account holds a position for SDK and devInspect state reads. */
export function hasPosition(options: HasPositionOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, '0x2::object::ID', 'u256'] satisfies (string | null)[];
	const parameterNames = ['account', 'expiryMarketId', 'orderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'predict_account',
			function: 'has_position',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExpiryPositionCountArguments {
	account: TransactionArgument;
	expiryMarketId: RawTransactionArgument<string>;
}
export interface ExpiryPositionCountOptions {
	package?: string;
	arguments:
		| ExpiryPositionCountArguments
		| [account: TransactionArgument, expiryMarketId: RawTransactionArgument<string>];
}
/** Return an expiry's open-position count for SDK and devInspect state reads. */
export function expiryPositionCount(options: ExpiryPositionCountOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['account', 'expiryMarketId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'predict_account',
			function: 'expiry_position_count',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TradingFeesPaidArguments {
	account: TransactionArgument;
	expiryMarketId: RawTransactionArgument<string>;
}
export interface TradingFeesPaidOptions {
	package?: string;
	arguments:
		| TradingFeesPaidArguments
		| [account: TransactionArgument, expiryMarketId: RawTransactionArgument<string>];
}
/** Return an account's aggregate expiry trading fees for SDK and devInspect reads. */
export function tradingFeesPaid(options: TradingFeesPaidOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['account', 'expiryMarketId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'predict_account',
			function: 'trading_fees_paid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ActiveStakeArguments {
	account: TransactionArgument;
}
export interface ActiveStakeOptions {
	package?: string;
	arguments: ActiveStakeArguments | [account: TransactionArgument];
}
/**
 * Return the stored active-stake split from the account's last epoch
 * reconciliation. This read does not roll newly eligible inactive stake forward.
 */
export function activeStake(options: ActiveStakeOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['account'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'predict_account',
			function: 'active_stake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InactiveStakeArguments {
	account: TransactionArgument;
}
export interface InactiveStakeOptions {
	package?: string;
	arguments: InactiveStakeArguments | [account: TransactionArgument];
}
/**
 * Return the stored inactive-stake split from the account's last epoch
 * reconciliation. This read does not roll stake that became eligible after an
 * epoch boundary.
 */
export function inactiveStake(options: InactiveStakeOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['account'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'predict_account',
			function: 'inactive_stake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BuilderCodeIdArguments {
	account: TransactionArgument;
}
export interface BuilderCodeIdOptions {
	package?: string;
	arguments: BuilderCodeIdArguments | [account: TransactionArgument];
}
/** Return the sticky builder-code ID, if set. */
export function builderCodeId(options: BuilderCodeIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['account'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'predict_account',
			function: 'builder_code_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetBuilderCodeArguments {
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	code: RawTransactionArgument<string>;
}
export interface SetBuilderCodeOptions {
	package?: string;
	arguments:
		| SetBuilderCodeArguments
		| [
				wrapper: RawTransactionArgument<string>,
				auth: TransactionArgument,
				code: RawTransactionArgument<string>,
		  ];
}
/**
 * Set sticky builder-code attribution for future trades using valid account auth.
 * Owner auth and authorized-app auth both satisfy the account borrow boundary.
 */
export function setBuilderCode(options: SetBuilderCodeOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['wrapper', 'auth', 'code'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'predict_account',
			function: 'set_builder_code',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UnsetBuilderCodeArguments {
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
}
export interface UnsetBuilderCodeOptions {
	package?: string;
	arguments:
		| UnsetBuilderCodeArguments
		| [wrapper: RawTransactionArgument<string>, auth: TransactionArgument];
}
/** Clear sticky builder-code attribution using valid owner or authorized-app auth. */
export function unsetBuilderCode(options: UnsetBuilderCodeOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['wrapper', 'auth'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'predict_account',
			function: 'unset_builder_code',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
