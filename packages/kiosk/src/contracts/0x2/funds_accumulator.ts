/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::funds_accumulator';
export const Withdrawal = new MoveStruct({
	name: `${$moduleName}::Withdrawal`,
	fields: {
		owner: bcs.Address,
		limit: bcs.u256(),
	},
});
export interface WithdrawalOwnerOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function withdrawalOwner(options: WithdrawalOwnerOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::funds_accumulator::Withdrawal<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'funds_accumulator',
			function: 'withdrawal_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawalLimitOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function withdrawalLimit(options: WithdrawalLimitOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::funds_accumulator::Withdrawal<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'funds_accumulator',
			function: 'withdrawal_limit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawalSplitOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
export function withdrawalSplit(options: WithdrawalSplitOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::funds_accumulator::Withdrawal<${options.typeArguments[0]}>`,
		'u256',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'funds_accumulator',
			function: 'withdrawal_split',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawalJoinOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function withdrawalJoin(options: WithdrawalJoinOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::funds_accumulator::Withdrawal<${options.typeArguments[0]}>`,
		`${packageAddress}::funds_accumulator::Withdrawal<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'funds_accumulator',
			function: 'withdrawal_join',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
