/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::zklogin_verified_id';
export const VerifiedID = new MoveStruct({
	name: `${$moduleName}::VerifiedID`,
	fields: {
		id: bcs.Address,
		owner: bcs.Address,
		key_claim_name: bcs.string(),
		key_claim_value: bcs.string(),
		issuer: bcs.string(),
		audience: bcs.string(),
	},
});
export interface OwnerOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function owner(options: OwnerOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::zklogin_verified_id::VerifiedID`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface KeyClaimNameOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function keyClaimName(options: KeyClaimNameOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::zklogin_verified_id::VerifiedID`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'key_claim_name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface KeyClaimValueOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function keyClaimValue(options: KeyClaimValueOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::zklogin_verified_id::VerifiedID`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'key_claim_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface IssuerOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function issuer(options: IssuerOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::zklogin_verified_id::VerifiedID`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'issuer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface AudienceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function audience(options: AudienceOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::zklogin_verified_id::VerifiedID`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'audience',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DeleteOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function _delete(options: DeleteOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::zklogin_verified_id::VerifiedID`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'delete',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface VerifyZkloginIdOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
	];
}
export function verifyZkloginId(options: VerifyZkloginIdOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'u256',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'verify_zklogin_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface CheckZkloginIdOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
	];
}
export function checkZkloginId(options: CheckZkloginIdOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		'address',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'u256',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'check_zklogin_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
