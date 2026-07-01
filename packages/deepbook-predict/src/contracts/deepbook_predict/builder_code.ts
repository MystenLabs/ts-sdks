/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Builder code identity and reward claiming for Predict.
 *
 * Builder codes are deterministic shared objects derived from the Predict
 * registry. Trade flows send add-on builder fees to the code object's address
 * balance, and the code owner can later claim those accumulated DUSDC funds.
 */

import {
	MoveTuple,
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/deepbook_predict::builder_code';
export const BuilderCodeKey = new MoveTuple({
	name: `${$moduleName}::BuilderCodeKey`,
	fields: [bcs.Address, bcs.u64()],
});
export const BuilderCode = new MoveStruct({
	name: `${$moduleName}::BuilderCode`,
	fields: {
		id: bcs.Address,
		owner: bcs.Address,
		index: bcs.u64(),
	},
});
export interface IdArguments {
	code: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [code: RawTransactionArgument<string>];
}
/** Return the builder code object ID. */
export function id(options: IdOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['code'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'builder_code',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OwnerArguments {
	code: RawTransactionArgument<string>;
}
export interface OwnerOptions {
	package?: string;
	arguments: OwnerArguments | [code: RawTransactionArgument<string>];
}
/** Return the permanent owner of this builder code. */
export function owner(options: OwnerOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['code'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'builder_code',
			function: 'owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IndexArguments {
	code: RawTransactionArgument<string>;
}
export interface IndexOptions {
	package?: string;
	arguments: IndexArguments | [code: RawTransactionArgument<string>];
}
/** Return this owner's builder-code index. */
export function index(options: IndexOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['code'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'builder_code',
			function: 'index',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ClaimableBuilderFeesArguments {
	root: RawTransactionArgument<string>;
	code: RawTransactionArgument<string>;
}
export interface ClaimableBuilderFeesOptions {
	package?: string;
	arguments:
		| ClaimableBuilderFeesArguments
		| [root: RawTransactionArgument<string>, code: RawTransactionArgument<string>];
}
/** Return the DUSDC builder fees currently visible for this code. */
export function claimableBuilderFees(options: ClaimableBuilderFeesOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['root', 'code'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'builder_code',
			function: 'claimable_builder_fees',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ClaimAllBuilderFeesArguments {
	code: RawTransactionArgument<string>;
	root: RawTransactionArgument<string>;
}
export interface ClaimAllBuilderFeesOptions {
	package?: string;
	arguments:
		| ClaimAllBuilderFeesArguments
		| [code: RawTransactionArgument<string>, root: RawTransactionArgument<string>];
}
/** Claim all settled DUSDC builder fees accumulated for this code. */
export function claimAllBuilderFees(options: ClaimAllBuilderFeesOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['code', 'root'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'builder_code',
			function: 'claim_all_builder_fees',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
