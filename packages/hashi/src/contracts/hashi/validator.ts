/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Validator registration and metadata maintenance. Entry points let a Sui
 * validator register as a Hashi committee member and update its next-epoch BLS
 * key, operator address, endpoint URL, TLS key, and next-epoch encryption key.
 * Every mutation emits an event for off-chain watchers.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
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
export const ValidatorResigned = new MoveStruct({
	name: `${$moduleName}::ValidatorResigned`,
	fields: {
		validator: bcs.Address,
	},
});
export const ValidatorResignationWithdrawn = new MoveStruct({
	name: `${$moduleName}::ValidatorResignationWithdrawn`,
	fields: {
		validator: bcs.Address,
	},
});
export const ValidatorDeregistered = new MoveStruct({
	name: `${$moduleName}::ValidatorDeregistered`,
	fields: {
		validator: bcs.Address,
	},
});
export interface RegisterArguments {
	self: RawTransactionArgument<string>;
}
export interface RegisterOptions {
	package?: string;
	arguments: RegisterArguments | [self: RawTransactionArgument<string>];
}
/**
 * Registration and key/metadata updates (below) are deliberately NOT gated on
 * pause/reconfig: operators must be able to rotate keys and prepare nodes while
 * the system is paused, and blocking updates during reconfig would let a stalled
 * reconfig freeze operator maintenance.
 */
export function register(options: RegisterOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, '0x3::sui_system::SuiSystemState'] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'register',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateNextEpochPublicKeyArguments {
	self: RawTransactionArgument<string>;
	validator: RawTransactionArgument<string>;
	nextEpochPublicKey: RawTransactionArgument<Array<number>>;
	proofOfPossessionSignature: RawTransactionArgument<Array<number>>;
}
export interface UpdateNextEpochPublicKeyOptions {
	package?: string;
	arguments:
		| UpdateNextEpochPublicKeyArguments
		| [
				self: RawTransactionArgument<string>,
				validator: RawTransactionArgument<string>,
				nextEpochPublicKey: RawTransactionArgument<Array<number>>,
				proofOfPossessionSignature: RawTransactionArgument<Array<number>>,
		  ];
}
export function updateNextEpochPublicKey(options: UpdateNextEpochPublicKeyOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'vector<u8>', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['self', 'validator', 'nextEpochPublicKey', 'proofOfPossessionSignature'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'update_next_epoch_public_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateOperatorAddressArguments {
	self: RawTransactionArgument<string>;
	validator: RawTransactionArgument<string>;
	operator: RawTransactionArgument<string>;
}
export interface UpdateOperatorAddressOptions {
	package?: string;
	arguments:
		| UpdateOperatorAddressArguments
		| [
				self: RawTransactionArgument<string>,
				validator: RawTransactionArgument<string>,
				operator: RawTransactionArgument<string>,
		  ];
}
export function updateOperatorAddress(options: UpdateOperatorAddressOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'validator', 'operator'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'update_operator_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateEndpointUrlArguments {
	self: RawTransactionArgument<string>;
	validator: RawTransactionArgument<string>;
	endpointUrl: RawTransactionArgument<string>;
}
export interface UpdateEndpointUrlOptions {
	package?: string;
	arguments:
		| UpdateEndpointUrlArguments
		| [
				self: RawTransactionArgument<string>,
				validator: RawTransactionArgument<string>,
				endpointUrl: RawTransactionArgument<string>,
		  ];
}
export function updateEndpointUrl(options: UpdateEndpointUrlOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['self', 'validator', 'endpointUrl'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'update_endpoint_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateTlsPublicKeyArguments {
	self: RawTransactionArgument<string>;
	validator: RawTransactionArgument<string>;
	tlsPublicKey: RawTransactionArgument<Array<number>>;
}
export interface UpdateTlsPublicKeyOptions {
	package?: string;
	arguments:
		| UpdateTlsPublicKeyArguments
		| [
				self: RawTransactionArgument<string>,
				validator: RawTransactionArgument<string>,
				tlsPublicKey: RawTransactionArgument<Array<number>>,
		  ];
}
export function updateTlsPublicKey(options: UpdateTlsPublicKeyOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['self', 'validator', 'tlsPublicKey'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'update_tls_public_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ResignArguments {
	self: RawTransactionArgument<string>;
	validator: RawTransactionArgument<string>;
}
export interface ResignOptions {
	package?: string;
	arguments:
		| ResignArguments
		| [self: RawTransactionArgument<string>, validator: RawTransactionArgument<string>];
}
/**
 * Voluntarily resign from the committee, authorized for the validator's own key or
 * its delegated operator key.
 *
 * Only sets the resignation flag: the member keeps serving the current epoch (and
 * a pending epoch mid-reconfiguration), the next committee formation skips them,
 * and the registration is deleted separately by the permissionless
 * `remove_inactive_member` once they hold no epoch duties — after which re-joining
 * requires a full re-registration. Revocable via `withdraw_resignation` until the
 * registration is removed.
 */
export function resign(options: ResignOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'validator'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'resign',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RemoveInactiveMemberArguments {
	self: RawTransactionArgument<string>;
	validator: RawTransactionArgument<string>;
}
export interface RemoveInactiveMemberOptions {
	package?: string;
	arguments:
		| RemoveInactiveMemberArguments
		| [self: RawTransactionArgument<string>, validator: RawTransactionArgument<string>];
}
/**
 * Permissionless registry cleanup: delete the registration of a member with no
 * epoch duties (not in the current committee, nor in a pending one
 * mid-reconfiguration) who either voluntarily resigned or is no longer in Sui's
 * active validator set. Deliberately independent of the reconfiguration flow,
 * which never touches the registry.
 *
 * Governance-ignored members are not removable — deleting the registration would
 * delete the flag with it, letting them shed the exclusion by simply
 * re-registering.
 */
export function removeInactiveMember(options: RemoveInactiveMemberOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, '0x3::sui_system::SuiSystemState', 'address'] satisfies (
		string | null
	)[];
	const parameterNames = ['self', 'validator'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'remove_inactive_member',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WithdrawResignationArguments {
	self: RawTransactionArgument<string>;
	validator: RawTransactionArgument<string>;
}
export interface WithdrawResignationOptions {
	package?: string;
	arguments:
		| WithdrawResignationArguments
		| [self: RawTransactionArgument<string>, validator: RawTransactionArgument<string>];
}
/**
 * Withdraw a pending resignation. If the next committee already formed without the
 * member, they keep their registration but sit out that one epoch.
 */
export function withdrawResignation(options: WithdrawResignationOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'validator'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'withdraw_resignation',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateNextEpochEncryptionPublicKeyArguments {
	self: RawTransactionArgument<string>;
	validator: RawTransactionArgument<string>;
	nextEpochEncryptionPublicKey: RawTransactionArgument<Array<number>>;
}
export interface UpdateNextEpochEncryptionPublicKeyOptions {
	package?: string;
	arguments:
		| UpdateNextEpochEncryptionPublicKeyArguments
		| [
				self: RawTransactionArgument<string>,
				validator: RawTransactionArgument<string>,
				nextEpochEncryptionPublicKey: RawTransactionArgument<Array<number>>,
		  ];
}
export function updateNextEpochEncryptionPublicKey(
	options: UpdateNextEpochEncryptionPublicKeyOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['self', 'validator', 'nextEpochEncryptionPublicKey'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'update_next_epoch_encryption_public_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
