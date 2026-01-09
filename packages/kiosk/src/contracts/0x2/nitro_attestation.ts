/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::nitro_attestation';
export const PCREntry = new MoveStruct({
	name: `${$moduleName}::PCREntry`,
	fields: {
		index: bcs.u8(),
		value: bcs.vector(bcs.u8()),
	},
});
export const NitroAttestationDocument = new MoveStruct({
	name: `${$moduleName}::NitroAttestationDocument`,
	fields: {
		module_id: bcs.vector(bcs.u8()),
		timestamp: bcs.u64(),
		digest: bcs.vector(bcs.u8()),
		pcrs: bcs.vector(PCREntry),
		public_key: bcs.option(bcs.vector(bcs.u8())),
		user_data: bcs.option(bcs.vector(bcs.u8())),
		nonce: bcs.option(bcs.vector(bcs.u8())),
	},
});
export interface LoadNitroAttestationOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function loadNitroAttestation(options: LoadNitroAttestationOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>', `${packageAddress}::clock::Clock`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'load_nitro_attestation',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ModuleIdOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function moduleId(options: ModuleIdOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::nitro_attestation::NitroAttestationDocument`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'module_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface TimestampOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function timestamp(options: TimestampOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::nitro_attestation::NitroAttestationDocument`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'timestamp',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DigestOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function digest(options: DigestOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::nitro_attestation::NitroAttestationDocument`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'digest',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PcrsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function pcrs(options: PcrsOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::nitro_attestation::NitroAttestationDocument`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'pcrs',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PublicKeyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function publicKey(options: PublicKeyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::nitro_attestation::NitroAttestationDocument`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'public_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UserDataOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function userData(options: UserDataOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::nitro_attestation::NitroAttestationDocument`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'user_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface NonceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function nonce(options: NonceOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::nitro_attestation::NitroAttestationDocument`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'nonce',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface IndexOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function index(options: IndexOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::nitro_attestation::PCREntry`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'index',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ValueOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function value(options: ValueOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::nitro_attestation::PCREntry`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
