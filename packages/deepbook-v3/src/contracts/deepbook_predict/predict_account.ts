/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Predict's per-account state, stored as an app-data slot on a shared `Account`
 * (the `account` package).
 *
 * This is Predict's account-local state: open positions and sticky builder-code
 * attribution. USDC/PLP custody lives in `Account`. The `PredictApp` witness
 * namespaces this slot, so only Predict writes it.
 *
 * Position mutations are package-internal. Builder-code configuration accepts an
 * account `Auth`; the account package decides which owner or authorized
 * application may obtain that mutable borrow.
 */

import {
	MoveTuple,
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U256, U64 } from '../../bcs/integers.js';
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
		order_id: U256,
	},
});
export const Position = new MoveStruct({
	name: `${$moduleName}::Position`,
	fields: {
		/** Root order ID, carried forward unchanged across partial-close replacements. */
		root_id: U256,
		/**
		 * On-chain time (`clock.timestamp_ms()`) the position was opened, carried forward
		 * unchanged across partial-close replacements. A live redeem in the same timestamp
		 * is rejected, blocking an atomic mint -> oracle-update -> redeem in one
		 * transaction.
		 */
		opened_at_ms: U64,
	},
});
export const PredictData = new MoveStruct({
	name: `${$moduleName}::PredictData`,
	fields: {
		/** Open positions scoped by expiry market. */
		positions: table.Table,
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
	config?: {
		predictPackageId?: string;
	};
}
/** Return whether an account holds a position for SDK and devInspect state reads. */
export function hasPosition(options: HasPositionOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
export interface BuilderCodeIdArguments {
	account: TransactionArgument;
}
export interface BuilderCodeIdOptions {
	package?: string;
	arguments: BuilderCodeIdArguments | [account: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the sticky builder-code ID, if set. */
export function builderCodeId(options: BuilderCodeIdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Set sticky builder-code attribution for future trades using valid account auth.
 * Owner auth and authorized-app auth both satisfy the account borrow boundary.
 */
export function setBuilderCode(options: SetBuilderCodeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
	config?: {
		predictPackageId?: string;
	};
}
/** Clear sticky builder-code attribution using valid owner or authorized-app auth. */
export function unsetBuilderCode(options: UnsetBuilderCodeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
