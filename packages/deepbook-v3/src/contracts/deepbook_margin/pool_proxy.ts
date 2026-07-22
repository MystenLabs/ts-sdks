/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
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
/**
 * Updates the current price for a pool using safe oracle price calculation. Anyone
 * can call this to update the price oracle used for order validation.
 */
export function updateCurrentPrice(options: UpdateCurrentPriceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['registry', 'pool', 'basePriceInfoObject', 'quotePriceInfoObject'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'update_current_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceLimitOrderArguments {
	Registry: RawTransactionArgument<string>;
	MarginManager: RawTransactionArgument<string>;
	Pool: RawTransactionArgument<string>;
	ClientOrderId: RawTransactionArgument<number | bigint>;
	OrderType: RawTransactionArgument<number>;
	SelfMatchingOption: RawTransactionArgument<number>;
	Price: RawTransactionArgument<number | bigint>;
	Quantity: RawTransactionArgument<number | bigint>;
	IsBid: RawTransactionArgument<boolean>;
	PayWithDeep: RawTransactionArgument<boolean>;
	ExpireTimestamp: RawTransactionArgument<number | bigint>;
}
export interface PlaceLimitOrderOptions {
	package?: string;
	arguments:
		| PlaceLimitOrderArguments
		| [
				Registry: RawTransactionArgument<string>,
				MarginManager: RawTransactionArgument<string>,
				Pool: RawTransactionArgument<string>,
				ClientOrderId: RawTransactionArgument<number | bigint>,
				OrderType: RawTransactionArgument<number>,
				SelfMatchingOption: RawTransactionArgument<number>,
				Price: RawTransactionArgument<number | bigint>,
				Quantity: RawTransactionArgument<number | bigint>,
				IsBid: RawTransactionArgument<boolean>,
				PayWithDeep: RawTransactionArgument<boolean>,
				ExpireTimestamp: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** DEPRECATED. Use `place_limit_order_v2`. */
export function placeLimitOrder(options: PlaceLimitOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
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
		'Registry',
		'MarginManager',
		'Pool',
		'ClientOrderId',
		'OrderType',
		'SelfMatchingOption',
		'Price',
		'Quantity',
		'IsBid',
		'PayWithDeep',
		'ExpireTimestamp',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'place_limit_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceMarketOrderArguments {
	Registry: RawTransactionArgument<string>;
	MarginManager: RawTransactionArgument<string>;
	Pool: RawTransactionArgument<string>;
	ClientOrderId: RawTransactionArgument<number | bigint>;
	SelfMatchingOption: RawTransactionArgument<number>;
	Quantity: RawTransactionArgument<number | bigint>;
	IsBid: RawTransactionArgument<boolean>;
	PayWithDeep: RawTransactionArgument<boolean>;
}
export interface PlaceMarketOrderOptions {
	package?: string;
	arguments:
		| PlaceMarketOrderArguments
		| [
				Registry: RawTransactionArgument<string>,
				MarginManager: RawTransactionArgument<string>,
				Pool: RawTransactionArgument<string>,
				ClientOrderId: RawTransactionArgument<number | bigint>,
				SelfMatchingOption: RawTransactionArgument<number>,
				Quantity: RawTransactionArgument<number | bigint>,
				IsBid: RawTransactionArgument<boolean>,
				PayWithDeep: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string];
}
/** DEPRECATED. Use `place_market_order_v2`. */
export function placeMarketOrder(options: PlaceMarketOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
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
		'Registry',
		'MarginManager',
		'Pool',
		'ClientOrderId',
		'SelfMatchingOption',
		'Quantity',
		'IsBid',
		'PayWithDeep',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'place_market_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceReduceOnlyLimitOrderArguments {
	Registry: RawTransactionArgument<string>;
	MarginManager: RawTransactionArgument<string>;
	Pool: RawTransactionArgument<string>;
	MarginPool: RawTransactionArgument<string>;
	ClientOrderId: RawTransactionArgument<number | bigint>;
	OrderType: RawTransactionArgument<number>;
	SelfMatchingOption: RawTransactionArgument<number>;
	Price: RawTransactionArgument<number | bigint>;
	Quantity: RawTransactionArgument<number | bigint>;
	IsBid: RawTransactionArgument<boolean>;
	PayWithDeep: RawTransactionArgument<boolean>;
	ExpireTimestamp: RawTransactionArgument<number | bigint>;
}
export interface PlaceReduceOnlyLimitOrderOptions {
	package?: string;
	arguments:
		| PlaceReduceOnlyLimitOrderArguments
		| [
				Registry: RawTransactionArgument<string>,
				MarginManager: RawTransactionArgument<string>,
				Pool: RawTransactionArgument<string>,
				MarginPool: RawTransactionArgument<string>,
				ClientOrderId: RawTransactionArgument<number | bigint>,
				OrderType: RawTransactionArgument<number>,
				SelfMatchingOption: RawTransactionArgument<number>,
				Price: RawTransactionArgument<number | bigint>,
				Quantity: RawTransactionArgument<number | bigint>,
				IsBid: RawTransactionArgument<boolean>,
				PayWithDeep: RawTransactionArgument<boolean>,
				ExpireTimestamp: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string, string];
}
/** DEPRECATED. Use `place_reduce_only_limit_order_v2`. */
export function placeReduceOnlyLimitOrder(options: PlaceReduceOnlyLimitOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
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
		'Registry',
		'MarginManager',
		'Pool',
		'MarginPool',
		'ClientOrderId',
		'OrderType',
		'SelfMatchingOption',
		'Price',
		'Quantity',
		'IsBid',
		'PayWithDeep',
		'ExpireTimestamp',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'place_reduce_only_limit_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceReduceOnlyMarketOrderArguments {
	Registry: RawTransactionArgument<string>;
	MarginManager: RawTransactionArgument<string>;
	Pool: RawTransactionArgument<string>;
	MarginPool: RawTransactionArgument<string>;
	ClientOrderId: RawTransactionArgument<number | bigint>;
	SelfMatchingOption: RawTransactionArgument<number>;
	Quantity: RawTransactionArgument<number | bigint>;
	IsBid: RawTransactionArgument<boolean>;
	PayWithDeep: RawTransactionArgument<boolean>;
}
export interface PlaceReduceOnlyMarketOrderOptions {
	package?: string;
	arguments:
		| PlaceReduceOnlyMarketOrderArguments
		| [
				Registry: RawTransactionArgument<string>,
				MarginManager: RawTransactionArgument<string>,
				Pool: RawTransactionArgument<string>,
				MarginPool: RawTransactionArgument<string>,
				ClientOrderId: RawTransactionArgument<number | bigint>,
				SelfMatchingOption: RawTransactionArgument<number>,
				Quantity: RawTransactionArgument<number | bigint>,
				IsBid: RawTransactionArgument<boolean>,
				PayWithDeep: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string, string];
}
/** DEPRECATED. Use `place_reduce_only_market_order_v2`. */
export function placeReduceOnlyMarketOrder(options: PlaceReduceOnlyMarketOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
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
		'Registry',
		'MarginManager',
		'Pool',
		'MarginPool',
		'ClientOrderId',
		'SelfMatchingOption',
		'Quantity',
		'IsBid',
		'PayWithDeep',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'place_reduce_only_market_order',
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
/** Places a limit order in the pool. */
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
			module: 'pool_proxy',
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
/** Places a market order in the pool. */
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
			module: 'pool_proxy',
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
/** Places a reduce-only order in the pool. Used when margin trading is disabled. */
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
			module: 'pool_proxy',
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
/**
 * Places a reduce-only market order in the pool. Used when margin trading is
 * disabled.
 *
 * Superseded by `place_reduce_only_market_order_and_repay_loan`. A market (taker)
 * fill always pays the spread, which lowers the oracle-valued `risk_ratio` while
 * the debt is unchanged, so the swap-only monotonic check here rejects essentially
 * every taker fill. The `_and_repay` variant deleverages with the proceeds so the
 * net-state ratio actually improves. Kept callable for existing integrators; its
 * reduce-only _direction_ guard matches the other entries — a bid needs base
 * (short-side) debt, the ask needs quote (long-side) debt and sells up to gross
 * base held — with no size cap.
 */
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
			module: 'pool_proxy',
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
/**
 * Atomically winds down a leveraged position: places a reduce-only market order,
 * repays the loan with the proceeds, then requires the net (post-repay) risk ratio
 * to be at least the pre-trade ratio.
 *
 * The post-repay check is the point. A market close pays the spread, which alone
 * lowers the oracle-valued ratio (debt is unchanged until repay) and would abort
 * the plain reduce-only path. Repaying first deleverages and absorbs the slippage
 * (still bounded by the `assert_price` band), and lets a manager in the
 * `liquidation..min_borrow` band climb out — it cannot reach the borrow floor in a
 * single swap.
 */
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
			module: 'pool_proxy',
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
/**
 * Reduce-only **limit** order that atomically repays the loan with the taker
 * fills. It is the limit/maker behaviour of `place_reduce_only_limit_order_v2`
 * plus the repay-then-net-monotonic gate of
 * `place_reduce_only_market_order_and_repay_loan`: the portion that crosses the
 * book fills immediately and settles, the rest rests as a maker, then the settled
 * (taker) proceeds repay the debt before the monotonic check on the net
 * (post-repay) state.
 *
 * This is the danger-band tool for a _price-bounded_ reduce: a crossing
 * reduce-only limit pays the spread on its taker fills, which alone would abort
 * `place_reduce_only_limit_order_v2`'s swap-only monotonic check; repaying first
 * deleverages so the net ratio holds. The resting remainder only locks balance
 * (counted in assets), so it doesn't move the ratio. Unfilled-and-resting behaves
 * exactly like `place_reduce_only_limit_order_v2` (nothing to repay).
 */
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
			module: 'pool_proxy',
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
/**
 * Atomically places a market order and repays the loan with the proceeds, gating
 * on a **monotonic** net-state check: if any debt remains after the repay, the
 * post-repay `risk_ratio` must be at least the pre-trade ratio (improve-or-hold).
 * A full close drives debt to 0 (`risk_ratio` MAX), which always passes.
 *
 * This is the everyday close / deleverage tool. The monotonic gate — rather than
 * the `min_open` opening floor used by `place_market_order_v2` — lets a position
 * in the `liquidation..min_borrow` danger band wind down _partially_: a small
 * close that lifts the ratio from, say, 1.12 to 1.15 is allowed even though 1.15
 * is still below `min_open`, which the opening floor would reject.
 *
 * Not reduce-only and uncapped, but the monotonic check makes a quantity cap
 * unnecessary: a market (taker) fill settles immediately, so any genuinely
 * exposure-_increasing_ trade lowers the ratio and aborts here, while any
 * deleveraging trade is allowed at any size — an overshoot past the debt is fine
 * (surplus is the manager's own holding) and `assert_price` still bounds slippage.
 * Requires margin trading enabled; in reduce-only mode use
 * `place_reduce_only_market_order_and_repay_loan`.
 */
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
			module: 'pool_proxy',
			function: 'place_market_order_and_repay_loan',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ModifyOrderArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
	newQuantity: RawTransactionArgument<number | bigint>;
}
export interface ModifyOrderOptions {
	package?: string;
	arguments:
		| ModifyOrderArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				orderId: RawTransactionArgument<number | bigint>,
				newQuantity: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Modifies an order */
export function modifyOrder(options: ModifyOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, 'u128', 'u64', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['registry', 'marginManager', 'pool', 'orderId', 'newQuantity'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'modify_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CancelOrderArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
}
export interface CancelOrderOptions {
	package?: string;
	arguments:
		| CancelOrderArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				orderId: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Cancels an order */
export function cancelOrder(options: CancelOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, 'u128', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['registry', 'marginManager', 'pool', 'orderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'cancel_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CancelOrdersArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	orderIds: RawTransactionArgument<Array<number | bigint>>;
}
export interface CancelOrdersOptions {
	package?: string;
	arguments:
		| CancelOrdersArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				orderIds: RawTransactionArgument<Array<number | bigint>>,
		  ];
	typeArguments: [string, string];
}
/** Cancel multiple orders within a vector. */
export function cancelOrders(options: CancelOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, 'vector<u128>', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['registry', 'marginManager', 'pool', 'orderIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'cancel_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CancelAllOrdersArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface CancelAllOrdersOptions {
	package?: string;
	arguments:
		| CancelAllOrdersArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Cancels all orders for the given account. */
export function cancelAllOrders(options: CancelAllOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['registry', 'marginManager', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'cancel_all_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawSettledAmountsArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface WithdrawSettledAmountsOptions {
	package?: string;
	arguments:
		| WithdrawSettledAmountsArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Withdraw settled amounts to balance_manager. */
export function withdrawSettledAmounts(options: WithdrawSettledAmountsOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'marginManager', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'withdraw_settled_amounts',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawSettledAmountsPermissionlessArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface WithdrawSettledAmountsPermissionlessOptions {
	package?: string;
	arguments:
		| WithdrawSettledAmountsPermissionlessArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Withdraw settled amounts to balance_manager permissionlessly. Anyone can call
 * this function to settle balances for a margin manager.
 */
export function withdrawSettledAmountsPermissionless(
	options: WithdrawSettledAmountsPermissionlessOptions,
) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'marginManager', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'withdraw_settled_amounts_permissionless',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface StakeArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface StakeOptions {
	package?: string;
	arguments:
		| StakeArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Stake DEEP tokens to the pool. */
export function stake(options: StakeOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['registry', 'marginManager', 'pool', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'stake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UnstakeArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface UnstakeOptions {
	package?: string;
	arguments:
		| UnstakeArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Unstake DEEP tokens from the pool. */
export function unstake(options: UnstakeOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'marginManager', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'unstake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SubmitProposalArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	takerFee: RawTransactionArgument<number | bigint>;
	makerFee: RawTransactionArgument<number | bigint>;
	stakeRequired: RawTransactionArgument<number | bigint>;
}
export interface SubmitProposalOptions {
	package?: string;
	arguments:
		| SubmitProposalArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				takerFee: RawTransactionArgument<number | bigint>,
				makerFee: RawTransactionArgument<number | bigint>,
				stakeRequired: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Submit proposal using the margin manager. */
export function submitProposal(options: SubmitProposalOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, 'u64', 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = [
		'registry',
		'marginManager',
		'pool',
		'takerFee',
		'makerFee',
		'stakeRequired',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'submit_proposal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface VoteArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	proposalId: RawTransactionArgument<string>;
}
export interface VoteOptions {
	package?: string;
	arguments:
		| VoteArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				proposalId: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Vote on a proposal using the margin manager. */
export function vote(options: VoteOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['registry', 'marginManager', 'pool', 'proposalId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'vote',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ClaimRebatesArguments {
	registry: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface ClaimRebatesOptions {
	package?: string;
	arguments:
		| ClaimRebatesArguments
		| [
				registry: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
export function claimRebates(options: ClaimRebatesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'marginManager', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_proxy',
			function: 'claim_rebates',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
