/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Validator registration and metadata maintenance. Entry points let a Sui
 * validator register as a Hashi committee member and update its next-epoch BLS
 * key, operator address, endpoint URL, TLS key, and next-epoch encryption key.
 * Every mutation emits an event for off-chain watchers.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
	resolveConfigArgument,
	applyConfigArguments,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/hashi::validator';
export const ValidatorRegistered = new MoveStruct({
	name: `${$moduleName}::ValidatorRegistered`,
	fields: {
		validator: bcs.Address,
	},
});
export const ValidatorUpdated = new MoveStruct({
	name: `${$moduleName}::ValidatorUpdated`,
	fields: {
		validator: bcs.Address,
	},
});
export interface RegisterArguments {
	self?: RawTransactionArgument<string>;
}
export interface RegisterOptions {
	package?: string;
	arguments?: RegisterArguments | [self?: RawTransactionArgument<string>];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
/**
 * Registration and key/metadata updates (below) are deliberately NOT gated on
 * pause/reconfig: operators must be able to rotate keys and prepare nodes while
 * the system is paused, and blocking updates during reconfig would let a stalled
 * reconfig freeze operator maintenance.
 */
export function register(options: RegisterOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, '0x3::sui_system::SuiSystemState'] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'register',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments ?? {}, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'validator',
									functionName: 'register',
									parameterIndex: 0,
									parameterName: 'self',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface UpdateNextEpochPublicKeyArguments {
	self?: RawTransactionArgument<string>;
	validator: RawTransactionArgument<string>;
	nextEpochPublicKey: RawTransactionArgument<Array<number>>;
	proofOfPossessionSignature: RawTransactionArgument<Array<number>>;
}
export interface UpdateNextEpochPublicKeyOptions {
	package?: string;
	arguments:
		| UpdateNextEpochPublicKeyArguments
		| [
				self: RawTransactionArgument<string> | undefined,
				validator: RawTransactionArgument<string>,
				nextEpochPublicKey: RawTransactionArgument<Array<number>>,
				proofOfPossessionSignature: RawTransactionArgument<Array<number>>,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function updateNextEpochPublicKey(options: UpdateNextEpochPublicKeyOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'vector<u8>', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['self', 'validator', 'nextEpochPublicKey', 'proofOfPossessionSignature'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'update_next_epoch_public_key',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'validator',
									functionName: 'update_next_epoch_public_key',
									parameterIndex: 0,
									parameterName: 'self',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface UpdateOperatorAddressArguments {
	self?: RawTransactionArgument<string>;
	validator: RawTransactionArgument<string>;
	operator: RawTransactionArgument<string>;
}
export interface UpdateOperatorAddressOptions {
	package?: string;
	arguments:
		| UpdateOperatorAddressArguments
		| [
				self: RawTransactionArgument<string> | undefined,
				validator: RawTransactionArgument<string>,
				operator: RawTransactionArgument<string>,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function updateOperatorAddress(options: UpdateOperatorAddressOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'validator', 'operator'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'update_operator_address',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'validator',
									functionName: 'update_operator_address',
									parameterIndex: 0,
									parameterName: 'self',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface UpdateEndpointUrlArguments {
	self?: RawTransactionArgument<string>;
	validator: RawTransactionArgument<string>;
	endpointUrl: RawTransactionArgument<string>;
}
export interface UpdateEndpointUrlOptions {
	package?: string;
	arguments:
		| UpdateEndpointUrlArguments
		| [
				self: RawTransactionArgument<string> | undefined,
				validator: RawTransactionArgument<string>,
				endpointUrl: RawTransactionArgument<string>,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function updateEndpointUrl(options: UpdateEndpointUrlOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['self', 'validator', 'endpointUrl'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'update_endpoint_url',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'validator',
									functionName: 'update_endpoint_url',
									parameterIndex: 0,
									parameterName: 'self',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface UpdateTlsPublicKeyArguments {
	self?: RawTransactionArgument<string>;
	validator: RawTransactionArgument<string>;
	tlsPublicKey: RawTransactionArgument<Array<number>>;
}
export interface UpdateTlsPublicKeyOptions {
	package?: string;
	arguments:
		| UpdateTlsPublicKeyArguments
		| [
				self: RawTransactionArgument<string> | undefined,
				validator: RawTransactionArgument<string>,
				tlsPublicKey: RawTransactionArgument<Array<number>>,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function updateTlsPublicKey(options: UpdateTlsPublicKeyOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['self', 'validator', 'tlsPublicKey'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'update_tls_public_key',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'validator',
									functionName: 'update_tls_public_key',
									parameterIndex: 0,
									parameterName: 'self',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface UpdateNextEpochEncryptionPublicKeyArguments {
	self?: RawTransactionArgument<string>;
	validator: RawTransactionArgument<string>;
	nextEpochEncryptionPublicKey: RawTransactionArgument<Array<number>>;
}
export interface UpdateNextEpochEncryptionPublicKeyOptions {
	package?: string;
	arguments:
		| UpdateNextEpochEncryptionPublicKeyArguments
		| [
				self: RawTransactionArgument<string> | undefined,
				validator: RawTransactionArgument<string>,
				nextEpochEncryptionPublicKey: RawTransactionArgument<Array<number>>,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function updateNextEpochEncryptionPublicKey(
	options: UpdateNextEpochEncryptionPublicKeyOptions,
) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['self', 'validator', 'nextEpochEncryptionPublicKey'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'update_next_epoch_encryption_public_key',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'validator',
									functionName: 'update_next_epoch_encryption_public_key',
									parameterIndex: 0,
									parameterName: 'self',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
