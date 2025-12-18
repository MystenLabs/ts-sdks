/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::zklogin_verified_issuer';
export const VerifiedIssuer = new MoveStruct({
	name: `${$moduleName}::VerifiedIssuer`,
	fields: {
		id: bcs.Address,
		owner: bcs.Address,
		issuer: bcs.string(),
	},
});
export interface OwnerOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function owner(options: OwnerOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::zklogin_verified_issuer::VerifiedIssuer`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_issuer',
			function: 'owner',
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
	const argumentsTypes = [
		`${packageAddress}::zklogin_verified_issuer::VerifiedIssuer`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_issuer',
			function: 'issuer',
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
	const argumentsTypes = [
		`${packageAddress}::zklogin_verified_issuer::VerifiedIssuer`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_issuer',
			function: 'delete',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface VerifyZkloginIssuerOptions {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<string>];
}
export function verifyZkloginIssuer(options: VerifyZkloginIssuerOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		'u256',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_issuer',
			function: 'verify_zklogin_issuer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface CheckZkloginIssuerOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
		RawTransactionArgument<string>,
	];
}
export function checkZkloginIssuer(options: CheckZkloginIssuerOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		'address',
		'u256',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'zklogin_verified_issuer',
			function: 'check_zklogin_issuer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
