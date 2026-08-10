/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Owns deterministic builder referral codes and the DUSDC fees delivered to their
 * object addresses through the funds accumulator. Codes are derived per owner and
 * index, and only the immutable owner may withdraw accumulated fees.
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
/** Returns the code identity for trade construction and external discovery. */
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
/** Returns the immutable owner authorized to claim fees. */
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
/** Returns the owner-selected derivation index for external discovery. */
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
	code: RawTransactionArgument<string>;
}
export interface ClaimableBuilderFeesOptions {
	package?: string;
	arguments: ClaimableBuilderFeesArguments | [code: RawTransactionArgument<string>];
}
/** Return visible DUSDC builder fees for SDK and devInspect reads. */
export function claimableBuilderFees(options: ClaimableBuilderFeesOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = ['0x2::accumulator::AccumulatorRoot', null] satisfies (string | null)[];
	const parameterNames = ['code'];
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
}
export interface ClaimAllBuilderFeesOptions {
	package?: string;
	arguments: ClaimAllBuilderFeesArguments | [code: RawTransactionArgument<string>];
}
/**
 * Claims all settled DUSDC builder fees for the immutable owner; an empty
 * accumulator returns a zero coin.
 */
export function claimAllBuilderFees(options: ClaimAllBuilderFeesOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, '0x2::accumulator::AccumulatorRoot'] satisfies (string | null)[];
	const parameterNames = ['code'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'builder_code',
			function: 'claim_all_builder_fees',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
