/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
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
		/** Issuing Nitro hypervisor module ID. */
		module_id: bcs.vector(bcs.u8()),
		/** UTC time when document was created, in milliseconds since UNIX epoch. */
		timestamp: bcs.u64(),
		/** The digest function used for calculating the register values. */
		digest: bcs.vector(bcs.u8()),
		/**
		 * A list of PCREntry containing the index and the PCR bytes.
		 * <https://docs.aws.amazon.com/enclaves/latest/user/set-up-attestation.html#where>.
		 */
		pcrs: bcs.vector(PCREntry),
		/**
		 * An optional DER-encoded key the attestation, consumer can use to encrypt data
		 * with.
		 */
		public_key: bcs.option(bcs.vector(bcs.u8())),
		/** Additional signed user data, defined by protocol. */
		user_data: bcs.option(bcs.vector(bcs.u8())),
		/**
		 * An optional cryptographic nonce provided by the attestation consumer as a proof
		 * of authenticity.
		 */
		nonce: bcs.option(bcs.vector(bcs.u8())),
	},
});
export interface LoadNitroAttestationArguments {
	attestation: RawTransactionArgument<number[]>;
}
export interface LoadNitroAttestationOptions {
	package: string;
	arguments: LoadNitroAttestationArguments | [attestation: RawTransactionArgument<number[]>];
}
/**
 * @param attestation: attesttaion documents bytes data. @param clock: the clock
 * object.
 *
 * Returns the parsed NitroAttestationDocument after verifying the attestation, may
 * abort with errors described above.
 */
export function loadNitroAttestation(options: LoadNitroAttestationOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['attestation'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'load_nitro_attestation',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ModuleIdArguments {
	attestation: RawTransactionArgument<string>;
}
export interface ModuleIdOptions {
	package: string;
	arguments: ModuleIdArguments | [attestation: RawTransactionArgument<string>];
}
export function moduleId(options: ModuleIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['attestation'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'module_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TimestampArguments {
	attestation: RawTransactionArgument<string>;
}
export interface TimestampOptions {
	package: string;
	arguments: TimestampArguments | [attestation: RawTransactionArgument<string>];
}
export function timestamp(options: TimestampOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['attestation'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'timestamp',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DigestArguments {
	attestation: RawTransactionArgument<string>;
}
export interface DigestOptions {
	package: string;
	arguments: DigestArguments | [attestation: RawTransactionArgument<string>];
}
export function digest(options: DigestOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['attestation'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'digest',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PcrsArguments {
	attestation: RawTransactionArgument<string>;
}
export interface PcrsOptions {
	package: string;
	arguments: PcrsArguments | [attestation: RawTransactionArgument<string>];
}
/**
 * Returns a list of mapping PCREntry containg the index and the PCR bytes. AWS
 * supports PCR0-31. All-zero PCR values are excluded.
 */
export function pcrs(options: PcrsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['attestation'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'pcrs',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PublicKeyArguments {
	attestation: RawTransactionArgument<string>;
}
export interface PublicKeyOptions {
	package: string;
	arguments: PublicKeyArguments | [attestation: RawTransactionArgument<string>];
}
export function publicKey(options: PublicKeyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['attestation'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'public_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UserDataArguments {
	attestation: RawTransactionArgument<string>;
}
export interface UserDataOptions {
	package: string;
	arguments: UserDataArguments | [attestation: RawTransactionArgument<string>];
}
export function userData(options: UserDataOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['attestation'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'user_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NonceArguments {
	attestation: RawTransactionArgument<string>;
}
export interface NonceOptions {
	package: string;
	arguments: NonceArguments | [attestation: RawTransactionArgument<string>];
}
export function nonce(options: NonceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['attestation'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'nonce',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IndexArguments {
	entry: RawTransactionArgument<string>;
}
export interface IndexOptions {
	package: string;
	arguments: IndexArguments | [entry: RawTransactionArgument<string>];
}
export function index(options: IndexOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['entry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'index',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValueArguments {
	entry: RawTransactionArgument<string>;
}
export interface ValueOptions {
	package: string;
	arguments: ValueArguments | [entry: RawTransactionArgument<string>];
}
export function value(options: ValueOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['entry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'nitro_attestation',
			function: 'value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
