/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pyth's upgraded Core entrypoints for `pool_proxy`.
 *
 * Pyth Core is being replaced by a separately published package, so its
 * `PriceInfoObject` is a distinct Move type from the legacy one and the frozen
 * signatures in `pool_proxy` can never accept it. The upgraded surface therefore
 * lives here, under the same function names. Each entry reads the upgraded feed
 * and delegates to the shared core in `pool_proxy`, so both feeds run identical
 * logic.
 */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface UpdateCurrentPriceArguments {
	registry: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	basePriceInfoObject: RawTransactionArgument<string>;
	quotePriceInfoObject: RawTransactionArgument<string>;
}
export interface UpdateCurrentPriceOptions {
	package?: string;
	arguments:
		| UpdateCurrentPriceArguments
		| [
				registry: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				basePriceInfoObject: RawTransactionArgument<string>,
				quotePriceInfoObject: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `pool_proxy::update_current_price`. Edit both. */
export function updateCurrentPrice(options: UpdateCurrentPriceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['registry', 'pool', 'basePriceInfoObject', 'quotePriceInfoObject'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy_upgraded',
			function: 'update_current_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceLimitOrderV2Arguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	clientOrderId: RawTransactionArgument<number | bigint>;
	orderType: RawTransactionArgument<number>;
	selfMatchingOption: RawTransactionArgument<number>;
	price: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
	expireTimestamp: RawTransactionArgument<number | bigint>;
}
export interface PlaceLimitOrderV2Options {
	package?: string;
	arguments:
		| PlaceLimitOrderV2Arguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				clientOrderId: RawTransactionArgument<number | bigint>,
				orderType: RawTransactionArgument<number>,
				selfMatchingOption: RawTransactionArgument<number>,
				price: RawTransactionArgument<number | bigint>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
				expireTimestamp: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `pool_proxy::place_limit_order_v2`. Edit both. */
export function placeLimitOrderV2(options: PlaceLimitOrderV2Options) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u8',
		'u8',
		'u64',
		'u64',
		'bool',
		'bool',
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'registry',
		'marginManager',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
		'baseOracle',
		'quoteOracle',
		'clientOrderId',
		'orderType',
		'selfMatchingOption',
		'price',
		'quantity',
		'isBid',
		'payWithDeep',
		'expireTimestamp',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy_upgraded',
			function: 'place_limit_order_v2',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceMarketOrderV2Arguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	clientOrderId: RawTransactionArgument<number | bigint>;
	selfMatchingOption: RawTransactionArgument<number>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
}
export interface PlaceMarketOrderV2Options {
	package?: string;
	arguments:
		| PlaceMarketOrderV2Arguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				clientOrderId: RawTransactionArgument<number | bigint>,
				selfMatchingOption: RawTransactionArgument<number>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `pool_proxy::place_market_order_v2`. Edit both. */
export function placeMarketOrderV2(options: PlaceMarketOrderV2Options) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u8',
		'u64',
		'bool',
		'bool',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'registry',
		'marginManager',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
		'baseOracle',
		'quoteOracle',
		'clientOrderId',
		'selfMatchingOption',
		'quantity',
		'isBid',
		'payWithDeep',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy_upgraded',
			function: 'place_market_order_v2',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceReduceOnlyLimitOrderV2Arguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	clientOrderId: RawTransactionArgument<number | bigint>;
	orderType: RawTransactionArgument<number>;
	selfMatchingOption: RawTransactionArgument<number>;
	price: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
	expireTimestamp: RawTransactionArgument<number | bigint>;
}
export interface PlaceReduceOnlyLimitOrderV2Options {
	package?: string;
	arguments:
		| PlaceReduceOnlyLimitOrderV2Arguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				clientOrderId: RawTransactionArgument<number | bigint>,
				orderType: RawTransactionArgument<number>,
				selfMatchingOption: RawTransactionArgument<number>,
				price: RawTransactionArgument<number | bigint>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
				expireTimestamp: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `pool_proxy::place_reduce_only_limit_order_v2`. Edit both. */
export function placeReduceOnlyLimitOrderV2(options: PlaceReduceOnlyLimitOrderV2Options) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u8',
		'u8',
		'u64',
		'u64',
		'bool',
		'bool',
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'registry',
		'marginManager',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
		'baseOracle',
		'quoteOracle',
		'clientOrderId',
		'orderType',
		'selfMatchingOption',
		'price',
		'quantity',
		'isBid',
		'payWithDeep',
		'expireTimestamp',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy_upgraded',
			function: 'place_reduce_only_limit_order_v2',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceReduceOnlyMarketOrderV2Arguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	clientOrderId: RawTransactionArgument<number | bigint>;
	selfMatchingOption: RawTransactionArgument<number>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
}
export interface PlaceReduceOnlyMarketOrderV2Options {
	package?: string;
	arguments:
		| PlaceReduceOnlyMarketOrderV2Arguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				clientOrderId: RawTransactionArgument<number | bigint>,
				selfMatchingOption: RawTransactionArgument<number>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `pool_proxy::place_reduce_only_market_order_v2`. Edit both. */
export function placeReduceOnlyMarketOrderV2(options: PlaceReduceOnlyMarketOrderV2Options) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u8',
		'u64',
		'bool',
		'bool',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'registry',
		'marginManager',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
		'baseOracle',
		'quoteOracle',
		'clientOrderId',
		'selfMatchingOption',
		'quantity',
		'isBid',
		'payWithDeep',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy_upgraded',
			function: 'place_reduce_only_market_order_v2',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceReduceOnlyMarketOrderAndRepayLoanArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	clientOrderId: RawTransactionArgument<number | bigint>;
	selfMatchingOption: RawTransactionArgument<number>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
}
export interface PlaceReduceOnlyMarketOrderAndRepayLoanOptions {
	package?: string;
	arguments:
		| PlaceReduceOnlyMarketOrderAndRepayLoanArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				clientOrderId: RawTransactionArgument<number | bigint>,
				selfMatchingOption: RawTransactionArgument<number>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `pool_proxy::place_reduce_only_market_order_and_repay_loan`. Edit both. */
export function placeReduceOnlyMarketOrderAndRepayLoan(
	options: PlaceReduceOnlyMarketOrderAndRepayLoanOptions,
) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u8',
		'u64',
		'bool',
		'bool',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'registry',
		'marginManager',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
		'baseOracle',
		'quoteOracle',
		'clientOrderId',
		'selfMatchingOption',
		'quantity',
		'isBid',
		'payWithDeep',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy_upgraded',
			function: 'place_reduce_only_market_order_and_repay_loan',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceReduceOnlyLimitOrderAndRepayLoanArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	clientOrderId: RawTransactionArgument<number | bigint>;
	orderType: RawTransactionArgument<number>;
	selfMatchingOption: RawTransactionArgument<number>;
	price: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
	expireTimestamp: RawTransactionArgument<number | bigint>;
}
export interface PlaceReduceOnlyLimitOrderAndRepayLoanOptions {
	package?: string;
	arguments:
		| PlaceReduceOnlyLimitOrderAndRepayLoanArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				clientOrderId: RawTransactionArgument<number | bigint>,
				orderType: RawTransactionArgument<number>,
				selfMatchingOption: RawTransactionArgument<number>,
				price: RawTransactionArgument<number | bigint>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
				expireTimestamp: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `pool_proxy::place_reduce_only_limit_order_and_repay_loan`. Edit both. */
export function placeReduceOnlyLimitOrderAndRepayLoan(
	options: PlaceReduceOnlyLimitOrderAndRepayLoanOptions,
) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u8',
		'u8',
		'u64',
		'u64',
		'bool',
		'bool',
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'registry',
		'marginManager',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
		'baseOracle',
		'quoteOracle',
		'clientOrderId',
		'orderType',
		'selfMatchingOption',
		'price',
		'quantity',
		'isBid',
		'payWithDeep',
		'expireTimestamp',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy_upgraded',
			function: 'place_reduce_only_limit_order_and_repay_loan',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceMarketOrderAndRepayLoanArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	clientOrderId: RawTransactionArgument<number | bigint>;
	selfMatchingOption: RawTransactionArgument<number>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
}
export interface PlaceMarketOrderAndRepayLoanOptions {
	package?: string;
	arguments:
		| PlaceMarketOrderAndRepayLoanArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				clientOrderId: RawTransactionArgument<number | bigint>,
				selfMatchingOption: RawTransactionArgument<number>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `pool_proxy::place_market_order_and_repay_loan`. Edit both. */
export function placeMarketOrderAndRepayLoan(options: PlaceMarketOrderAndRepayLoanOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u8',
		'u64',
		'bool',
		'bool',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'registry',
		'marginManager',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
		'baseOracle',
		'quoteOracle',
		'clientOrderId',
		'selfMatchingOption',
		'quantity',
		'isBid',
		'payWithDeep',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy_upgraded',
			function: 'place_market_order_and_repay_loan',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
