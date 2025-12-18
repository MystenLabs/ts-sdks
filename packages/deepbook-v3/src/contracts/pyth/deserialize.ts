/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface DeserializeVectorOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
}
export function deserializeVector(options: DeserializeVectorOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		'0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94::cursor::Cursor<u8>',
		'u64',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'deserialize',
			function: 'deserialize_vector',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DeserializeU8Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function deserializeU8(options: DeserializeU8Options) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		'0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94::cursor::Cursor<u8>',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'deserialize',
			function: 'deserialize_u8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DeserializeU16Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function deserializeU16(options: DeserializeU16Options) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		'0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94::cursor::Cursor<u8>',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'deserialize',
			function: 'deserialize_u16',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DeserializeU32Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function deserializeU32(options: DeserializeU32Options) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		'0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94::cursor::Cursor<u8>',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'deserialize',
			function: 'deserialize_u32',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DeserializeI32Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function deserializeI32(options: DeserializeI32Options) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		'0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94::cursor::Cursor<u8>',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'deserialize',
			function: 'deserialize_i32',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DeserializeU64Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function deserializeU64(options: DeserializeU64Options) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		'0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94::cursor::Cursor<u8>',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'deserialize',
			function: 'deserialize_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DeserializeI64Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function deserializeI64(options: DeserializeI64Options) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		'0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94::cursor::Cursor<u8>',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'deserialize',
			function: 'deserialize_i64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
