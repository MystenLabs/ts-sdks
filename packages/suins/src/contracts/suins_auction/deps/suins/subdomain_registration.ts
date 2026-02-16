/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A wrapper for `SuinsRegistration` subdomain objects.
 *
 * With the wrapper, we are allowing easier distinction between second level names
 * & subdomains in RPC Querying | filtering.
 *
 * We maintain all core functionality unchanged for registry, expiration etc.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as suins_registration from './suins_registration.js';
const $moduleName = 'suins::subdomain_registration';
export const SubDomainRegistration = new MoveStruct({
	name: `${$moduleName}::SubDomainRegistration`,
	fields: {
		id: bcs.Address,
		nft: suins_registration.SuinsRegistration,
	},
});
export interface NftArguments {
	name: RawTransactionArgument<string>;
}
export interface NftOptions {
	package: string;
	arguments: NftArguments | [name: RawTransactionArgument<string>];
}
export function nft(options: NftOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_registration',
			function: 'nft',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NftMutArguments {
	name: RawTransactionArgument<string>;
}
export interface NftMutOptions {
	package: string;
	arguments: NftMutArguments | [name: RawTransactionArgument<string>];
}
export function nftMut(options: NftMutOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_registration',
			function: 'nft_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
