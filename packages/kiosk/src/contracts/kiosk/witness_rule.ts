/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Description: This module implements a Rule that requires a "Proof" witness to be
 * presented on every transfer. The "Proof" witness is a type chosen by the owner
 * of the policy.
 *
 * Configuration:
 *
 * - The type to require for every transfer.
 *
 * Use Cases:
 *
 * - Can be used to link custom logic to the TransferPolicy via the Witness.
 * - Only allow trading on a certain marketplace.
 * - Require a confirmation in a third party module
 * - Implement a custom requirement on the creator side an link the logic.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/kiosk::witness_rule';
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
	typeArguments: [string, string];
}
/**
 * Creator action: adds the Rule. Requires a "Proof" witness confirmation on every
 * transfer.
 */
export function add(options: AddOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['policy', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'witness_rule',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ProveArguments<Proof extends BcsType<any>> {
	Proof: RawTransactionArgument<Proof>;
	policy: RawTransactionArgument<string>;
	request: RawTransactionArgument<string>;
}
export interface ProveOptions<Proof extends BcsType<any>> {
	package?: string;
	arguments:
		| ProveArguments<Proof>
		| [
				Proof: RawTransactionArgument<Proof>,
				policy: RawTransactionArgument<string>,
				request: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Buyer action: follow the policy. Present the required "Proof" instance to get a
 * receipt.
 */
export function prove<Proof extends BcsType<any>>(options: ProveOptions<Proof>) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [`${options.typeArguments[1]}`, null, null] satisfies (string | null)[];
	const parameterNames = ['Proof', 'policy', 'request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'witness_rule',
			function: 'prove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
