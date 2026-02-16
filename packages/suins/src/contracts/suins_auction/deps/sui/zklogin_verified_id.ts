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
const $moduleName = '0x2::zklogin_verified_id';
export const VerifiedID = new MoveStruct({
	name: `${$moduleName}::VerifiedID`,
	fields: {
		/** The ID of this VerifiedID */
		id: bcs.Address,
		/** The address this VerifiedID is associated with */
		owner: bcs.Address,
		/** The name of the key claim */
		key_claim_name: bcs.string(),
		/** The value of the key claim */
		key_claim_value: bcs.string(),
		/** The issuer */
		issuer: bcs.string(),
		/** The audience (wallet) */
		audience: bcs.string(),
	},
});
export interface OwnerArguments {
	verifiedId: RawTransactionArgument<string>;
}
export interface OwnerOptions {
	package: string;
	arguments: OwnerArguments | [verifiedId: RawTransactionArgument<string>];
}
/** Returns the address associated with the given VerifiedID */
export function owner(options: OwnerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['verifiedId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface KeyClaimNameArguments {
	verifiedId: RawTransactionArgument<string>;
}
export interface KeyClaimNameOptions {
	package: string;
	arguments: KeyClaimNameArguments | [verifiedId: RawTransactionArgument<string>];
}
/** Returns the name of the key claim associated with the given VerifiedID */
export function keyClaimName(options: KeyClaimNameOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['verifiedId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'key_claim_name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface KeyClaimValueArguments {
	verifiedId: RawTransactionArgument<string>;
}
export interface KeyClaimValueOptions {
	package: string;
	arguments: KeyClaimValueArguments | [verifiedId: RawTransactionArgument<string>];
}
/** Returns the value of the key claim associated with the given VerifiedID */
export function keyClaimValue(options: KeyClaimValueOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['verifiedId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'key_claim_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IssuerArguments {
	verifiedId: RawTransactionArgument<string>;
}
export interface IssuerOptions {
	package: string;
	arguments: IssuerArguments | [verifiedId: RawTransactionArgument<string>];
}
/** Returns the issuer associated with the given VerifiedID */
export function issuer(options: IssuerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['verifiedId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'issuer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AudienceArguments {
	verifiedId: RawTransactionArgument<string>;
}
export interface AudienceOptions {
	package: string;
	arguments: AudienceArguments | [verifiedId: RawTransactionArgument<string>];
}
/** Returns the audience (wallet) associated with the given VerifiedID */
export function audience(options: AudienceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['verifiedId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'audience',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DeleteArguments {
	verifiedId: RawTransactionArgument<string>;
}
export interface DeleteOptions {
	package: string;
	arguments: DeleteArguments | [verifiedId: RawTransactionArgument<string>];
}
/** Delete a VerifiedID */
export function _delete(options: DeleteOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['verifiedId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'delete',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VerifyZkloginIdArguments {
	KeyClaimName: RawTransactionArgument<string>;
	KeyClaimValue: RawTransactionArgument<string>;
	Issuer: RawTransactionArgument<string>;
	Audience: RawTransactionArgument<string>;
	PinHash: RawTransactionArgument<number | bigint>;
}
export interface VerifyZkloginIdOptions {
	package: string;
	arguments:
		| VerifyZkloginIdArguments
		| [
				KeyClaimName: RawTransactionArgument<string>,
				KeyClaimValue: RawTransactionArgument<string>,
				Issuer: RawTransactionArgument<string>,
				Audience: RawTransactionArgument<string>,
				PinHash: RawTransactionArgument<number | bigint>,
		  ];
}
/** This function has been disabled. */
export function verifyZkloginId(options: VerifyZkloginIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
		'u256',
	] satisfies (string | null)[];
	const parameterNames = ['KeyClaimName', 'KeyClaimValue', 'Issuer', 'Audience', 'PinHash'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'verify_zklogin_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CheckZkloginIdArguments {
	Address: RawTransactionArgument<string>;
	KeyClaimName: RawTransactionArgument<string>;
	KeyClaimValue: RawTransactionArgument<string>;
	Issuer: RawTransactionArgument<string>;
	Audience: RawTransactionArgument<string>;
	PinHash: RawTransactionArgument<number | bigint>;
}
export interface CheckZkloginIdOptions {
	package: string;
	arguments:
		| CheckZkloginIdArguments
		| [
				Address: RawTransactionArgument<string>,
				KeyClaimName: RawTransactionArgument<string>,
				KeyClaimValue: RawTransactionArgument<string>,
				Issuer: RawTransactionArgument<string>,
				Audience: RawTransactionArgument<string>,
				PinHash: RawTransactionArgument<number | bigint>,
		  ];
}
/** This function has been disabled. */
export function checkZkloginId(options: CheckZkloginIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [
		'address',
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
		'u256',
	] satisfies (string | null)[];
	const parameterNames = [
		'Address',
		'KeyClaimName',
		'KeyClaimValue',
		'Issuer',
		'Audience',
		'PinHash',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_id',
			function: 'check_zklogin_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
