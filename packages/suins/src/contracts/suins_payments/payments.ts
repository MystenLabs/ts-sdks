/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveTuple,
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as type_name from './deps/std/type_name.js';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@suins/payments::payments';
export const PaymentsApp = new MoveTuple({
	name: `${$moduleName}::PaymentsApp`,
	fields: [bcs.bool()],
});
export const CoinTypeData = new MoveStruct({
	name: `${$moduleName}::CoinTypeData`,
	fields: {
		/** The coin's decimals. */
		decimals: bcs.u8(),
		discount_percentage: bcs.u8(),
		price_feed_id: bcs.vector(bcs.u8()),
		type_name: type_name.TypeName,
	},
});
export const PaymentsConfig = new MoveStruct({
	name: `${$moduleName}::PaymentsConfig`,
	fields: {
		currencies: vec_map.VecMap(type_name.TypeName, CoinTypeData),
		base_currency: type_name.TypeName,
		max_age: bcs.u64(),
		/** The percentage of the payment that gets burned, in basis points. */
		burn_bps: bcs.u64(),
	},
});
export interface HandleBasePaymentArguments {
	suins: RawTransactionArgument<string>;
	bbbVault: RawTransactionArgument<string>;
	intent: RawTransactionArgument<string>;
	payment: RawTransactionArgument<string>;
}
export interface HandleBasePaymentOptions {
	package?: string;
	arguments:
		| HandleBasePaymentArguments
		| [
				suins: RawTransactionArgument<string>,
				bbbVault: RawTransactionArgument<string>,
				intent: RawTransactionArgument<string>,
				payment: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * This has to be called with our base payment currency. The payment has to be
 * equal to the base price of the domain. We do not need to check the price feed
 * for the base currency.
 */
export function handleBasePayment(options: HandleBasePaymentOptions) {
	const packageAddress = options.package ?? '@suins/payments';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::bbb_vault::BBBVault`,
		`${packageAddress}::payment::PaymentIntent`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[0]}>`,
	] satisfies string[];
	const parameterNames = ['suins', 'bbbVault', 'intent', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payments',
			function: 'handle_base_payment',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface HandlePaymentArguments {
	suins: RawTransactionArgument<string>;
	bbbVault: RawTransactionArgument<string>;
	intent: RawTransactionArgument<string>;
	payment: RawTransactionArgument<string>;
	priceInfoObject: RawTransactionArgument<string>;
	userPriceGuard: RawTransactionArgument<number | bigint>;
}
export interface HandlePaymentOptions {
	package?: string;
	arguments:
		| HandlePaymentArguments
		| [
				suins: RawTransactionArgument<string>,
				bbbVault: RawTransactionArgument<string>,
				intent: RawTransactionArgument<string>,
				payment: RawTransactionArgument<string>,
				priceInfoObject: RawTransactionArgument<string>,
				userPriceGuard: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Handles a payment done for a non-base currency payment. E.g. SUI, NS.
 *
 * The payment amount is derived from the base currency price and the Pyth price
 * feed.
 *
 * The `user_price_guard` is a value that the user expects to pay. If the payment
 * amount is higher than this value, the payment will be rejected. This is to
 * protect the user from paying more than they expected on their FEs. Ideally, this
 * number should be calculated on the FE based on the price that is being displayed
 * to the user (with a buffer determined by the FE).
 */
export function handlePayment(options: HandlePaymentOptions) {
	const packageAddress = options.package ?? '@suins/payments';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::bbb_vault::BBBVault`,
		`${packageAddress}::payment::PaymentIntent`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		'0x8d97f1cd6ac663735be08d1d2b6d02a159e711586461306ce60a2b7a6a565a9e::price_info::PriceInfoObject',
		'u64',
	] satisfies string[];
	const parameterNames = [
		'suins',
		'bbbVault',
		'intent',
		'payment',
		'priceInfoObject',
		'userPriceGuard',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payments',
			function: 'handle_payment',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CalculatePriceArguments {
	suins: RawTransactionArgument<string>;
	baseAmount: RawTransactionArgument<number | bigint>;
	priceInfoObject: RawTransactionArgument<string>;
}
export interface CalculatePriceOptions {
	package?: string;
	arguments:
		| CalculatePriceArguments
		| [
				suins: RawTransactionArgument<string>,
				baseAmount: RawTransactionArgument<number | bigint>,
				priceInfoObject: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Calculates the amount that has to be paid in the target currency.
 *
 * Can be used to split the payment amount in a single PTB.
 *
 * 1.  const intent = function_to_get_intent();
 * 2.  const price = calculate_price<SUI>(suins, intent, ...);
 * 3.  const coin = txb.splitCoins(baseCoin, [price])
 * 4.  handle_payment<SUI>(suins, intent, coin, ...);
 */
export function calculatePrice(options: CalculatePriceOptions) {
	const packageAddress = options.package ?? '@suins/payments';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		'0x8d97f1cd6ac663735be08d1d2b6d02a159e711586461306ce60a2b7a6a565a9e::price_info::PriceInfoObject',
	] satisfies string[];
	const parameterNames = ['suins', 'baseAmount', 'priceInfoObject'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payments',
			function: 'calculate_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CalculatePriceAfterDiscountArguments {
	suins: RawTransactionArgument<string>;
	intent: RawTransactionArgument<string>;
}
export interface CalculatePriceAfterDiscountOptions {
	package?: string;
	arguments:
		| CalculatePriceAfterDiscountArguments
		| [suins: RawTransactionArgument<string>, intent: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function calculatePriceAfterDiscount(options: CalculatePriceAfterDiscountOptions) {
	const packageAddress = options.package ?? '@suins/payments';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::payment::PaymentIntent`,
	] satisfies string[];
	const parameterNames = ['suins', 'intent'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payments',
			function: 'calculate_price_after_discount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewCoinTypeDataArguments {
	coinMetadata: RawTransactionArgument<string>;
	discountPercentage: RawTransactionArgument<number>;
	priceFeedId: RawTransactionArgument<number[]>;
}
export interface NewCoinTypeDataOptions {
	package?: string;
	arguments:
		| NewCoinTypeDataArguments
		| [
				coinMetadata: RawTransactionArgument<string>,
				discountPercentage: RawTransactionArgument<number>,
				priceFeedId: RawTransactionArgument<number[]>,
		  ];
	typeArguments: [string];
}
/** Creates a new CoinTypeData struct. Leave price_feed_id empty for base currency. */
export function newCoinTypeData(options: NewCoinTypeDataOptions) {
	const packageAddress = options.package ?? '@suins/payments';
	const argumentsTypes = [
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::CoinMetadata<${options.typeArguments[0]}>`,
		'u8',
		'vector<u8>',
	] satisfies string[];
	const parameterNames = ['coinMetadata', 'discountPercentage', 'priceFeedId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payments',
			function: 'new_coin_type_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewPaymentsConfigArguments {
	setups: RawTransactionArgument<string[]>;
	baseCurrency: RawTransactionArgument<string>;
	maxAge: RawTransactionArgument<number | bigint>;
	burnBps: RawTransactionArgument<number | bigint>;
}
export interface NewPaymentsConfigOptions {
	package?: string;
	arguments:
		| NewPaymentsConfigArguments
		| [
				setups: RawTransactionArgument<string[]>,
				baseCurrency: RawTransactionArgument<string>,
				maxAge: RawTransactionArgument<number | bigint>,
				burnBps: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Creates a new PaymentsConfig struct. Can be attached by the Admin to SuiNS to
 * allow the payments module to work.
 */
export function newPaymentsConfig(options: NewPaymentsConfigOptions) {
	const packageAddress = options.package ?? '@suins/payments';
	const argumentsTypes = [
		`vector<${packageAddress}::payments::CoinTypeData>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::type_name::TypeName',
		'u64',
		'u64',
	] satisfies string[];
	const parameterNames = ['setups', 'baseCurrency', 'maxAge', 'burnBps'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payments',
			function: 'new_payments_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
