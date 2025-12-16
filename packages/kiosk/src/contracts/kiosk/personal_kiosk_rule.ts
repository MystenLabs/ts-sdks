/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Description: This module defines a Rule which checks that the Kiosk is
 * "personal" meaning that the owner cannot change. By default, `KioskOwnerCap` can
 * be transferred and owned by an application therefore the owner of the Kiosk is
 * not fixed.
 *
 * Configuration:
 *
 * - None
 *
 * Use cases:
 *
 * - Strong royalty enforcement - personal Kiosks cannot be transferred with the
 *   assets inside which means that the item will never change the owner.
 *
 * Notes:
 *
 * - Combination of `kiosk_lock_rule` and `personal_kiosk_rule` can be used to
 *   enforce policies on every trade (item can be transferred only through a
 *   trade + Kiosk is fixed to the owner).
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/kiosk::personal_kiosk_rule';
export const Rule = new MoveStruct({
	name: `${$moduleName}::Rule`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface AddArguments {
	policy: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface AddOptions {
	package?: string;
	arguments:
		| AddArguments
		| [policy: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Add the "owned" rule to the KioskOwnerCap. */
export function add(options: AddOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		`0x0000000000000000000000000000000000000000000000000000000000000002::transfer_policy::TransferPolicy<${options.typeArguments[0]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::transfer_policy::TransferPolicyCap<${options.typeArguments[0]}>`,
	] satisfies string[];
	const parameterNames = ['policy', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'personal_kiosk_rule',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ProveArguments {
	kiosk: RawTransactionArgument<string>;
	request: RawTransactionArgument<string>;
}
export interface ProveOptions {
	package?: string;
	arguments:
		| ProveArguments
		| [kiosk: RawTransactionArgument<string>, request: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Make sure that the destination Kiosk has the Owner key. Item is already placed
 * by the time this check is performed - otherwise fails.
 */
export function prove(options: ProveOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::Kiosk',
		`0x0000000000000000000000000000000000000000000000000000000000000002::transfer_policy::TransferRequest<${options.typeArguments[0]}>`,
	] satisfies string[];
	const parameterNames = ['kiosk', 'request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'personal_kiosk_rule',
			function: 'prove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
