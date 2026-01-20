/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface InitPythOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
		RawTransactionArgument<number | bigint>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number | bigint[]>,
		RawTransactionArgument<number[][]>,
		RawTransactionArgument<number | bigint>,
	];
}
export function initPyth(options: InitPythOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		null,
		null,
		'u64',
		'u64',
		'vector<u8>',
		'vector<u64>',
		'vector<vector<u8>>',
		'u64',
	] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth',
			function: 'init_pyth',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface CreatePriceFeedsUsingAccumulatorOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<string>,
	];
}
export function createPriceFeedsUsingAccumulator(options: CreatePriceFeedsUsingAccumulatorOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, 'vector<u8>', null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth',
			function: 'create_price_feeds_using_accumulator',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface CreatePriceFeedsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string[]>];
}
export function createPriceFeeds(options: CreatePriceFeedsOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, 'vector<null>', '0x2::clock::Clock'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth',
			function: 'create_price_feeds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface CreateAuthenticatedPriceInfosUsingAccumulatorOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<string>,
	];
}
export function createAuthenticatedPriceInfosUsingAccumulator(
	options: CreateAuthenticatedPriceInfosUsingAccumulatorOptions,
) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, 'vector<u8>', null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth',
			function: 'create_authenticated_price_infos_using_accumulator',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface CreatePriceInfosHotPotatoOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string[]>];
}
export function createPriceInfosHotPotato(options: CreatePriceInfosHotPotatoOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, 'vector<null>', '0x2::clock::Clock'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth',
			function: 'create_price_infos_hot_potato',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UpdateSinglePriceFeedOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
}
export function updateSinglePriceFeed(options: UpdateSinglePriceFeedOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth',
			function: 'update_single_price_feed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PriceFeedExistsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function priceFeedExists(options: PriceFeedExistsOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth',
			function: 'price_feed_exists',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetPriceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function getPrice(options: GetPriceOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth',
			function: 'get_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetPriceNoOlderThanOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
}
export function getPriceNoOlderThan(options: GetPriceNoOlderThanOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, '0x2::clock::Clock', 'u64'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth',
			function: 'get_price_no_older_than',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetPriceUnsafeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getPriceUnsafe(options: GetPriceUnsafeOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth',
			function: 'get_price_unsafe',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetStalePriceThresholdSecsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getStalePriceThresholdSecs(options: GetStalePriceThresholdSecsOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth',
			function: 'get_stale_price_threshold_secs',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetTotalUpdateFeeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
}
export function getTotalUpdateFee(options: GetTotalUpdateFeeOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth',
			function: 'get_total_update_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
