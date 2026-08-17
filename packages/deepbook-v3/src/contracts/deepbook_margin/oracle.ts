/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Oracle module for margin trading. */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as type_name from './deps/std/type_name.js';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@deepbook/margin::oracle';
export const CoinTypeData = new MoveStruct({
	name: `${$moduleName}::CoinTypeData`,
	fields: {
		decimals: bcs.u8(),
		price_feed_id: bcs.vector(bcs.u8()),
		type_name: type_name.TypeName,
		max_conf_bps: bcs.u64(),
		max_ewma_difference_bps: bcs.u64(),
	},
});
export const PythConfig = new MoveStruct({
	name: `${$moduleName}::PythConfig`,
	fields: {
		currencies: vec_map.VecMap(type_name.TypeName, CoinTypeData),
		max_age_secs: bcs.u64(),
	},
});
export const ConversionConfig = new MoveStruct({
	name: `${$moduleName}::ConversionConfig`,
	fields: {
		target_decimals: bcs.u8(),
		base_decimals: bcs.u8(),
		pyth_price: bcs.u64(),
		pyth_decimals: bcs.u8(),
	},
});
export const PythReading = new MoveStruct({
	name: `${$moduleName}::PythReading`,
	fields: {
		price: bcs.u64(),
		decimals: bcs.u8(),
		/**
		 * `some` only for validated reads. The confidence bound is a _pricing_ guard, not
		 * a read guard: it is asserted in `price_config`, so a reading taken purely for
		 * telemetry (the deposit event) is never rejected for a wide interval. Unvalidated
		 * reads carry `none` and skip the check, as they always have.
		 */
		conf: bcs.option(bcs.u64()),
		/**
		 * The asset this price is _for_, stamped by the reader from the same config row
		 * the feed id was checked against. `price_config` asserts it matches the type it
		 * is being consumed as, so a reading routed to the wrong leg aborts instead of
		 * silently mis-pricing. Without it, transposing the base and quote readings at a
		 * call site is invisible: both are well-formed, both pass every other guard.
		 */
		coin_type: type_name.TypeName,
	},
});
export interface NewCoinTypeDataArguments {
	CoinMetadata: RawTransactionArgument<string>;
	PriceFeedId: RawTransactionArgument<Array<number>>;
	MaxConfBps: RawTransactionArgument<number | bigint>;
	MaxEwmaDifferenceBps: RawTransactionArgument<number | bigint>;
}
export interface NewCoinTypeDataOptions {
	package?: string;
	arguments:
		| NewCoinTypeDataArguments
		| [
				CoinMetadata: RawTransactionArgument<string>,
				PriceFeedId: RawTransactionArgument<Array<number>>,
				MaxConfBps: RawTransactionArgument<number | bigint>,
				MaxEwmaDifferenceBps: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Superseded by `new_coin_type_data_from_currency`, which reads decimals from
 * `Currency` instead of trusting the caller-supplied `CoinMetadata`. Retained as
 * an aborting stub because it is public in the deployed package: a `compatible`
 * upgrade cannot drop a public function.
 */
export function newCoinTypeData(options: NewCoinTypeDataOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, 'vector<u8>', 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['CoinMetadata', 'PriceFeedId', 'MaxConfBps', 'MaxEwmaDifferenceBps'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'oracle',
			function: 'new_coin_type_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewCoinTypeDataFromCurrencyArguments {
	currency: RawTransactionArgument<string>;
	priceFeedId: RawTransactionArgument<Array<number>>;
	maxConfBps: RawTransactionArgument<number | bigint>;
	maxEwmaDifferenceBps: RawTransactionArgument<number | bigint>;
}
export interface NewCoinTypeDataFromCurrencyOptions {
	package?: string;
	arguments:
		| NewCoinTypeDataFromCurrencyArguments
		| [
				currency: RawTransactionArgument<string>,
				priceFeedId: RawTransactionArgument<Array<number>>,
				maxConfBps: RawTransactionArgument<number | bigint>,
				maxEwmaDifferenceBps: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Creates a new CoinTypeData struct of type T. Uses Currency to avoid any errors
 * in decimals.
 */
export function newCoinTypeDataFromCurrency(options: NewCoinTypeDataFromCurrencyOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, 'vector<u8>', 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['currency', 'priceFeedId', 'maxConfBps', 'maxEwmaDifferenceBps'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'oracle',
			function: 'new_coin_type_data_from_currency',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewPythConfigArguments {
	setups: TransactionArgument;
	maxAgeSecs: RawTransactionArgument<number | bigint>;
}
export interface NewPythConfigOptions {
	package?: string;
	arguments:
		| NewPythConfigArguments
		| [setups: TransactionArgument, maxAgeSecs: RawTransactionArgument<number | bigint>];
}
/**
 * Creates a new PythConfig struct. Can be attached by the Admin to MarginRegistry
 * to allow oracle to work.
 */
export function newPythConfig(options: NewPythConfigOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = ['vector<null>', 'u64'] satisfies (string | null)[];
	const parameterNames = ['setups', 'maxAgeSecs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'oracle',
			function: 'new_pyth_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
