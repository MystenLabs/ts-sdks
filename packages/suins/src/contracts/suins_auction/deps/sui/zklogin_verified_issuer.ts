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
const $moduleName = '0x2::zklogin_verified_issuer';
export const VerifiedIssuer = new MoveStruct({
	name: `${$moduleName}::VerifiedIssuer`,
	fields: {
		/** The ID of this VerifiedIssuer */
		id: bcs.Address,
		/** The address this VerifiedID is associated with */
		owner: bcs.Address,
		/** The issuer */
		issuer: bcs.string(),
	},
});
export interface OwnerArguments {
	verifiedIssuer: RawTransactionArgument<string>;
}
export interface OwnerOptions {
	package: string;
	arguments: OwnerArguments | [verifiedIssuer: RawTransactionArgument<string>];
}
/** Returns the address associated with the given VerifiedIssuer */
export function owner(options: OwnerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['verifiedIssuer'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_issuer',
			function: 'owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IssuerArguments {
	verifiedIssuer: RawTransactionArgument<string>;
}
export interface IssuerOptions {
	package: string;
	arguments: IssuerArguments | [verifiedIssuer: RawTransactionArgument<string>];
}
/** Returns the issuer associated with the given VerifiedIssuer */
export function issuer(options: IssuerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['verifiedIssuer'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_issuer',
			function: 'issuer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DeleteArguments {
	verifiedIssuer: RawTransactionArgument<string>;
}
export interface DeleteOptions {
	package: string;
	arguments: DeleteArguments | [verifiedIssuer: RawTransactionArgument<string>];
}
/** Delete a VerifiedIssuer */
export function _delete(options: DeleteOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['verifiedIssuer'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_issuer',
			function: 'delete',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VerifyZkloginIssuerArguments {
	addressSeed: RawTransactionArgument<number | bigint>;
	issuer: RawTransactionArgument<string>;
}
export interface VerifyZkloginIssuerOptions {
	package: string;
	arguments:
		| VerifyZkloginIssuerArguments
		| [
				addressSeed: RawTransactionArgument<number | bigint>,
				issuer: RawTransactionArgument<string>,
		  ];
}
/**
 * Verify that the caller's address was created using zklogin with the given
 * issuer. If so, a VerifiedIssuer object with the issuers id transferred to the
 * caller.
 *
 * Aborts with `EInvalidProof` if the verification fails.
 */
export function verifyZkloginIssuer(options: VerifyZkloginIssuerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u256', '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['addressSeed', 'issuer'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_issuer',
			function: 'verify_zklogin_issuer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CheckZkloginIssuerArguments {
	address: RawTransactionArgument<string>;
	addressSeed: RawTransactionArgument<number | bigint>;
	issuer: RawTransactionArgument<string>;
}
export interface CheckZkloginIssuerOptions {
	package: string;
	arguments:
		| CheckZkloginIssuerArguments
		| [
				address: RawTransactionArgument<string>,
				addressSeed: RawTransactionArgument<number | bigint>,
				issuer: RawTransactionArgument<string>,
		  ];
}
/**
 * Returns true if `address` was created using zklogin with the given issuer and
 * address seed.
 */
export function checkZkloginIssuer(options: CheckZkloginIssuerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['address', 'u256', '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['address', 'addressSeed', 'issuer'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_issuer',
			function: 'check_zklogin_issuer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
