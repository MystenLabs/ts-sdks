/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as price_feed from './price_feed.js';
import * as object from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/object.js';
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::price_info';
export const PriceInfo = new MoveStruct({
	name: `${$moduleName}::PriceInfo`,
	fields: {
		attestation_time: bcs.u64(),
		arrival_time: bcs.u64(),
		price_feed: price_feed.PriceFeed,
	},
});
export const PriceInfoObject = new MoveStruct({
	name: `${$moduleName}::PriceInfoObject`,
	fields: {
		id: object.UID,
		price_info: PriceInfo,
	},
});
export interface GetIdBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function getIdBytes(options: GetIdBytesOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::UID',
		`${packageAddress}::price_identifier::PriceIdentifier`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_info',
			function: 'get_id_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetIdOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function getId(options: GetIdOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::UID',
		`${packageAddress}::price_identifier::PriceIdentifier`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_info',
			function: 'get_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ContainsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function contains(options: ContainsOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::UID',
		`${packageAddress}::price_identifier::PriceIdentifier`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_info',
			function: 'contains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetBalanceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getBalance(options: GetBalanceOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::price_info::PriceInfoObject`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_info',
			function: 'get_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DepositFeeCoinsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function depositFeeCoins(options: DepositFeeCoinsOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::price_info::PriceInfoObject`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_info',
			function: 'deposit_fee_coins',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface NewPriceInfoOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<number | bigint>,
		RawTransactionArgument<number | bigint>,
		RawTransactionArgument<string>,
	];
}
export function newPriceInfo(options: NewPriceInfoOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		'u64',
		'u64',
		`${packageAddress}::price_feed::PriceFeed`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_info',
			function: 'new_price_info',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UidToInnerOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function uidToInner(options: UidToInnerOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::price_info::PriceInfoObject`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_info',
			function: 'uid_to_inner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetPriceInfoFromPriceInfoObjectOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getPriceInfoFromPriceInfoObject(options: GetPriceInfoFromPriceInfoObjectOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::price_info::PriceInfoObject`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_info',
			function: 'get_price_info_from_price_info_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetPriceIdentifierOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getPriceIdentifier(options: GetPriceIdentifierOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::price_info::PriceInfo`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_info',
			function: 'get_price_identifier',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetPriceFeedOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getPriceFeed(options: GetPriceFeedOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::price_info::PriceInfo`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_info',
			function: 'get_price_feed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetAttestationTimeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getAttestationTime(options: GetAttestationTimeOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::price_info::PriceInfo`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_info',
			function: 'get_attestation_time',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetArrivalTimeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getArrivalTime(options: GetArrivalTimeOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::price_info::PriceInfo`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_info',
			function: 'get_arrival_time',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
