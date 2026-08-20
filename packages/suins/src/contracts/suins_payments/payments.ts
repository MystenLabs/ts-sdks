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
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
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
	intent: TransactionArgument;
	payment: RawTransactionArgument<string>;
}
export interface HandleBasePaymentOptions {
	package?: string;
	arguments:
		| HandleBasePaymentArguments
		| [
				suins: RawTransactionArgument<string>,
				bbbVault: RawTransactionArgument<string>,
				intent: TransactionArgument,
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
	const argumentsTypes = [null, null, null, null] satisfies (string | null)[];
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
	Suins: RawTransactionArgument<string>;
	BbbVault: RawTransactionArgument<string>;
	Intent: TransactionArgument;
	Payment: RawTransactionArgument<string>;
	PriceInfoObject: RawTransactionArgument<string>;
	UserPriceGuard: RawTransactionArgument<number | bigint>;
}
export interface HandlePaymentOptions {
	package?: string;
	arguments:
		| HandlePaymentArguments
		| [
				Suins: RawTransactionArgument<string>,
				BbbVault: RawTransactionArgument<string>,
				Intent: TransactionArgument,
				Payment: RawTransactionArgument<string>,
				PriceInfoObject: RawTransactionArgument<string>,
				UserPriceGuard: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Deprecated after the Pyth Core to Pro cutover: reads the Core feed, which stops
 * updating. The signature is retained for upgrade compatibility, but the body is
 * disabled. Use `handle_payment_pro` instead. Callers needing the Core feed can
 * still target the pre-upgrade package version.
 */
export function handlePayment(options: HandlePaymentOptions) {
	const packageAddress = options.package ?? '@suins/payments';
	const argumentsTypes = [null, null, null, null, '0x2::clock::Clock', null, 'u64'] satisfies (
		| string
		| null
	)[];
	const parameterNames = [
		'Suins',
		'BbbVault',
		'Intent',
		'Payment',
		'PriceInfoObject',
		'UserPriceGuard',
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
export interface HandlePaymentProArguments {
	suins: RawTransactionArgument<string>;
	bbbVault: RawTransactionArgument<string>;
	intent: TransactionArgument;
	payment: RawTransactionArgument<string>;
	priceInfoObject: RawTransactionArgument<string>;
	userPriceGuard: RawTransactionArgument<number | bigint>;
}
export interface HandlePaymentProOptions {
	package?: string;
	arguments:
		| HandlePaymentProArguments
		| [
				suins: RawTransactionArgument<string>,
				bbbVault: RawTransactionArgument<string>,
				intent: TransactionArgument,
				payment: RawTransactionArgument<string>,
				priceInfoObject: RawTransactionArgument<string>,
				userPriceGuard: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * `handle_payment` variant that reads the Pro-compatible Pyth feed, for use after
 * the Pyth Core to Pro cutover. Behaviour matches `handle_payment`; only the price
 * source differs.
 */
export function handlePaymentPro(options: HandlePaymentProOptions) {
	const packageAddress = options.package ?? '@suins/payments';
	const argumentsTypes = [null, null, null, null, '0x2::clock::Clock', null, 'u64'] satisfies (
		string | null
	)[];
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
			function: 'handle_payment_pro',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CalculatePriceArguments {
	Suins: RawTransactionArgument<string>;
	BaseAmount: RawTransactionArgument<number | bigint>;
	PriceInfoObject: RawTransactionArgument<string>;
}
export interface CalculatePriceOptions {
	package?: string;
	arguments:
		| CalculatePriceArguments
		| [
				Suins: RawTransactionArgument<string>,
				BaseAmount: RawTransactionArgument<number | bigint>,
				PriceInfoObject: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Deprecated after the Pyth Core to Pro cutover: reads the Core feed, which stops
 * updating. The signature is retained for upgrade compatibility, but the body is
 * disabled. Use `calculate_price_pro` instead. Callers needing the Core feed can
 * still target the pre-upgrade package version.
 */
export function calculatePrice(options: CalculatePriceOptions) {
	const packageAddress = options.package ?? '@suins/payments';
	const argumentsTypes = [null, 'u64', '0x2::clock::Clock', null] satisfies (string | null)[];
	const parameterNames = ['Suins', 'BaseAmount', 'PriceInfoObject'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payments',
			function: 'calculate_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CalculatePriceProArguments {
	suins: RawTransactionArgument<string>;
	baseAmount: RawTransactionArgument<number | bigint>;
	priceInfoObject: RawTransactionArgument<string>;
}
export interface CalculatePriceProOptions {
	package?: string;
	arguments:
		| CalculatePriceProArguments
		| [
				suins: RawTransactionArgument<string>,
				baseAmount: RawTransactionArgument<number | bigint>,
				priceInfoObject: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * `calculate_price` variant that reads the Pro-compatible Pyth feed, for use after
 * the Pyth Core to Pro cutover. Behaviour matches `calculate_price`; only the
 * price source differs.
 */
export function calculatePricePro(options: CalculatePriceProOptions) {
	const packageAddress = options.package ?? '@suins/payments';
	const argumentsTypes = [null, 'u64', '0x2::clock::Clock', null] satisfies (string | null)[];
	const parameterNames = ['suins', 'baseAmount', 'priceInfoObject'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payments',
			function: 'calculate_price_pro',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CalculatePriceAfterDiscountArguments {
	suins: RawTransactionArgument<string>;
	intent: TransactionArgument;
}
export interface CalculatePriceAfterDiscountOptions {
	package?: string;
	arguments:
		| CalculatePriceAfterDiscountArguments
		| [suins: RawTransactionArgument<string>, intent: TransactionArgument];
	typeArguments: [string];
}
export function calculatePriceAfterDiscount(options: CalculatePriceAfterDiscountOptions) {
	const packageAddress = options.package ?? '@suins/payments';
	const argumentsTypes = [null, null] satisfies (string | null)[];
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
	priceFeedId: RawTransactionArgument<Array<number>>;
}
export interface NewCoinTypeDataOptions {
	package?: string;
	arguments:
		| NewCoinTypeDataArguments
		| [
				coinMetadata: RawTransactionArgument<string>,
				discountPercentage: RawTransactionArgument<number>,
				priceFeedId: RawTransactionArgument<Array<number>>,
		  ];
	typeArguments: [string];
}
/** Creates a new CoinTypeData struct. Leave price_feed_id empty for base currency. */
export function newCoinTypeData(options: NewCoinTypeDataOptions) {
	const packageAddress = options.package ?? '@suins/payments';
	const argumentsTypes = [null, 'u8', 'vector<u8>'] satisfies (string | null)[];
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
	setups: TransactionArgument;
	baseCurrency: TransactionArgument;
	maxAge: RawTransactionArgument<number | bigint>;
	burnBps: RawTransactionArgument<number | bigint>;
}
export interface NewPaymentsConfigOptions {
	package?: string;
	arguments:
		| NewPaymentsConfigArguments
		| [
				setups: TransactionArgument,
				baseCurrency: TransactionArgument,
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
	const argumentsTypes = ['vector<null>', null, 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['setups', 'baseCurrency', 'maxAge', 'burnBps'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payments',
			function: 'new_payments_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
