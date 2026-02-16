/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Implementation of decryption for Seal using Boneh-Franklin over BLS12-381 as KEM
 * and Hmac256Ctr as DEM. Refer usage at docs
 * https://seal-docs.wal.app/UsingSeal/#on-chain-decryption
 */

import {
	MoveStruct,
	MoveEnum,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as group_ops from '../sui/group_ops.js';
const $moduleName = 'seal::bf_hmac_encryption';
export const EncryptedObject = new MoveStruct({
	name: `${$moduleName}::EncryptedObject`,
	fields: {
		package_id: bcs.Address,
		id: bcs.vector(bcs.u8()),
		indices: bcs.vector(bcs.u8()),
		services: bcs.vector(bcs.Address),
		threshold: bcs.u8(),
		nonce: group_ops.Element,
		encrypted_shares: bcs.vector(bcs.vector(bcs.u8())),
		encrypted_randomness: bcs.vector(bcs.u8()),
		blob: bcs.vector(bcs.u8()),
		aad: bcs.option(bcs.vector(bcs.u8())),
		mac: bcs.vector(bcs.u8()),
	},
});
export const VerifiedDerivedKey = new MoveStruct({
	name: `${$moduleName}::VerifiedDerivedKey`,
	fields: {
		derived_key: group_ops.Element,
		package_id: bcs.Address,
		id: bcs.vector(bcs.u8()),
		key_server: bcs.Address,
	},
});
export const PublicKey = new MoveStruct({
	name: `${$moduleName}::PublicKey`,
	fields: {
		key_server: bcs.Address,
		pk: group_ops.Element,
	},
});
/** An enum representing the different purposes of the derived key. */
export const KeyPurpose = new MoveEnum({
	name: `${$moduleName}::KeyPurpose`,
	fields: {
		EncryptedRandomness: null,
		DEM: null,
	},
});
export interface NewPublicKeyArguments {
	keyServerId: RawTransactionArgument<string>;
	pkBytes: RawTransactionArgument<number[]>;
}
export interface NewPublicKeyOptions {
	package: string;
	arguments:
		| NewPublicKeyArguments
		| [keyServerId: RawTransactionArgument<string>, pkBytes: RawTransactionArgument<number[]>];
}
/** Creates PublicKey from key server ID and public key bytes. */
export function newPublicKey(options: NewPublicKeyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['keyServerId', 'pkBytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'new_public_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DecryptArguments {
	encryptedObject: RawTransactionArgument<string>;
	verifiedDerivedKeys: RawTransactionArgument<string[]>;
	publicKeys: RawTransactionArgument<string[]>;
}
export interface DecryptOptions {
	package: string;
	arguments:
		| DecryptArguments
		| [
				encryptedObject: RawTransactionArgument<string>,
				verifiedDerivedKeys: RawTransactionArgument<string[]>,
				publicKeys: RawTransactionArgument<string[]>,
		  ];
}
/**
 * Decrypts an encrypted object using the given verified derived keys.
 *
 * Call `verify_derived_keys` to verify derived keys before calling this function.
 *
 * Aborts if there are not enough verified derived keys to reach the threshold.
 * Aborts if any of the key servers for the given verified derived keys are not
 * among the key servers found in the encrypted object. Aborts if the given public
 * keys do not contain exactly one public key for all key servers in the encrypted
 * object and no more.
 *
 * If the decryption fails, e.g. the AAD or MAC is invalid, the function returns
 * `none`.
 *
 * If some key servers are weighted, each derived key contributes the weight of the
 * key server to the threshold. The public keys can be in any order and there
 * should be exactly one per key server. The provided verified derived keys can be
 * in any order, but there should be at most one per key server.
 */
export function decrypt(options: DecryptOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'vector<null>', 'vector<null>'] satisfies (string | null)[];
	const parameterNames = ['encryptedObject', 'verifiedDerivedKeys', 'publicKeys'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'decrypt',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VerifyDerivedKeysArguments {
	derivedKeys: RawTransactionArgument<string[]>;
	packageId: RawTransactionArgument<string>;
	id: RawTransactionArgument<number[]>;
	publicKeys: RawTransactionArgument<string[]>;
}
export interface VerifyDerivedKeysOptions {
	package: string;
	arguments:
		| VerifyDerivedKeysArguments
		| [
				derivedKeys: RawTransactionArgument<string[]>,
				packageId: RawTransactionArgument<string>,
				id: RawTransactionArgument<number[]>,
				publicKeys: RawTransactionArgument<string[]>,
		  ];
}
/**
 * Returns a vector of `VerifiedDerivedKey`s, asserting that all derived_keys are
 * valid for the given full ID and key servers. The order of the derived keys and
 * the public keys must match. Aborts if the number of key servers does not match
 * the number of derived keys.
 */
export function verifyDerivedKeys(options: VerifyDerivedKeysOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<null>', 'address', 'vector<u8>', 'vector<null>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['derivedKeys', 'packageId', 'id', 'publicKeys'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'verify_derived_keys',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ParseEncryptedObjectArguments {
	object: RawTransactionArgument<number[]>;
}
export interface ParseEncryptedObjectOptions {
	package: string;
	arguments: ParseEncryptedObjectArguments | [object: RawTransactionArgument<number[]>];
}
/**
 * Deserialize a BCS encoded EncryptedObject. Fails if the version is not 0. Fails
 * if the object is not a valid EncryptedObject. Fails if the encryption type is
 * not Hmac256Ctr. Fails if the KEM type is not Boneh-Franklin over BLS12-381.
 */
export function parseEncryptedObject(options: ParseEncryptedObjectOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['object'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'parse_encrypted_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PackageIdArguments {
	self: RawTransactionArgument<string>;
}
export interface PackageIdOptions {
	package: string;
	arguments: PackageIdArguments | [self: RawTransactionArgument<string>];
}
export function packageId(options: PackageIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'package_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IdArguments {
	self: RawTransactionArgument<string>;
}
export interface IdOptions {
	package: string;
	arguments: IdArguments | [self: RawTransactionArgument<string>];
}
export function id(options: IdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ServicesArguments {
	self: RawTransactionArgument<string>;
}
export interface ServicesOptions {
	package: string;
	arguments: ServicesArguments | [self: RawTransactionArgument<string>];
}
export function services(options: ServicesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'services',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IndicesArguments {
	self: RawTransactionArgument<string>;
}
export interface IndicesOptions {
	package: string;
	arguments: IndicesArguments | [self: RawTransactionArgument<string>];
}
export function indices(options: IndicesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'indices',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ThresholdArguments {
	self: RawTransactionArgument<string>;
}
export interface ThresholdOptions {
	package: string;
	arguments: ThresholdArguments | [self: RawTransactionArgument<string>];
}
export function threshold(options: ThresholdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'threshold',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NonceArguments {
	self: RawTransactionArgument<string>;
}
export interface NonceOptions {
	package: string;
	arguments: NonceArguments | [self: RawTransactionArgument<string>];
}
export function nonce(options: NonceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'nonce',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EncryptedSharesArguments {
	self: RawTransactionArgument<string>;
}
export interface EncryptedSharesOptions {
	package: string;
	arguments: EncryptedSharesArguments | [self: RawTransactionArgument<string>];
}
export function encryptedShares(options: EncryptedSharesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'encrypted_shares',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EncryptedRandomnessArguments {
	self: RawTransactionArgument<string>;
}
export interface EncryptedRandomnessOptions {
	package: string;
	arguments: EncryptedRandomnessArguments | [self: RawTransactionArgument<string>];
}
export function encryptedRandomness(options: EncryptedRandomnessOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'encrypted_randomness',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BlobArguments {
	self: RawTransactionArgument<string>;
}
export interface BlobOptions {
	package: string;
	arguments: BlobArguments | [self: RawTransactionArgument<string>];
}
export function blob(options: BlobOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AadArguments {
	self: RawTransactionArgument<string>;
}
export interface AadOptions {
	package: string;
	arguments: AadArguments | [self: RawTransactionArgument<string>];
}
export function aad(options: AadOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'aad',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MacArguments {
	self: RawTransactionArgument<string>;
}
export interface MacOptions {
	package: string;
	arguments: MacArguments | [self: RawTransactionArgument<string>];
}
export function mac(options: MacOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bf_hmac_encryption',
			function: 'mac',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
