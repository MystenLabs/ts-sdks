/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Owns deterministic builder referral codes and the USDC fees delivered to their
 * object addresses through the funds accumulator. Codes are derived per owner and
 * index, and only the immutable owner may withdraw accumulated fees. A trade names
 * the code it pays, and its fee per contract, as a `BuilderFee`.
 */

import {
	MoveTuple,
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/deepbook_predict::builder_code';
export const BuilderCodeKey = new MoveTuple({
	name: `${$moduleName}::BuilderCodeKey`,
	fields: [bcs.Address, U64],
});
export const BuilderCode = new MoveStruct({
	name: `${$moduleName}::BuilderCode`,
	fields: {
		id: bcs.Address,
		owner: bcs.Address,
		index: U64,
	},
});
export const BuilderFee = new MoveStruct({
	name: `${$moduleName}::BuilderFee`,
	fields: {
		code_id: bcs.Address,
		fee_per_contract: U64,
	},
});
export interface IdArguments {
	code: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [code: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Returns the code identity for trade construction and external discovery. */
export function id(options: IdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
export interface NewFeeArguments {
	code: RawTransactionArgument<string>;
	feePerContract: RawTransactionArgument<number | bigint>;
}
export interface NewFeeOptions {
	package?: string;
	arguments:
		| NewFeeArguments
		| [
				code: RawTransactionArgument<string>,
				feePerContract: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Name `code` and its fee per contract for one trade. For PTB construction and the
 * order-flow companion, which pass it to Predict's builder admission.
 */
export function newFee(options: NewFeeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['code', 'feePerContract'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'builder_code',
			function: 'new_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CodeIdArguments {
	fee: TransactionArgument;
}
export interface CodeIdOptions {
	package?: string;
	arguments: CodeIdArguments | [fee: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Returns the code a `BuilderFee` pays, for the companion and Sessions' checks. */
export function codeId(options: CodeIdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['fee'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'builder_code',
			function: 'code_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FeePerContractArguments {
	fee: TransactionArgument;
}
export interface FeePerContractOptions {
	package?: string;
	arguments: FeePerContractArguments | [fee: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Returns a `BuilderFee`'s uncapped fee per contract, for the companion and
 * Sessions' checks.
 */
export function feePerContract(options: FeePerContractOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['fee'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'builder_code',
			function: 'fee_per_contract',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OwnerArguments {
	code: RawTransactionArgument<string>;
}
export interface OwnerOptions {
	package?: string;
	arguments: OwnerArguments | [code: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Returns the immutable owner authorized to claim fees. */
export function owner(options: OwnerOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
	config?: {
		predictPackageId?: string;
	};
}
/** Returns the owner-selected derivation index for external discovery. */
export function index(options: IndexOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
	config?: {
		predictPackageId?: string;
	};
}
/** Return visible USDC builder fees for SDK and devInspect reads. */
export function claimableBuilderFees(options: ClaimableBuilderFeesOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Claims all settled USDC builder fees for the immutable owner; an empty
 * accumulator returns a zero coin.
 */
export function claimAllBuilderFees(options: ClaimAllBuilderFeesOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
