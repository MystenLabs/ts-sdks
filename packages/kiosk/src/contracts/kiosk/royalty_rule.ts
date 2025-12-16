/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Description: This module defines a Rule which requires a payment on a purchase.
 * The payment amount can be either a fixed amount (min_amount) or a percentage of
 * the purchase price (amount_bp). Or both: the higher of the two is used.
 *
 * Configuration:
 *
 * - amount_bp - the percentage of the purchase price to be paid as a fee,
 *   denominated in basis points (100_00 = 100%, 1 = 0.01%).
 * - min_amount - the minimum amount to be paid as a fee if the relative amount is
 *   lower than this setting.
 *
 * Use cases:
 *
 * - Percentage-based Royalty fee for the creator of the NFT.
 * - Fixed commission fee on a trade.
 * - A mix of both: the higher of the two is used.
 *
 * Notes:
 *
 * - To use it as a fixed commission set the `amount_bp` to 0 and use the
 *   `min_amount` to set the fixed amount.
 * - To use it as a percentage-based fee set the `min_amount` to 0 and use the
 *   `amount_bp` to set the percentage.
 * - To use it as a mix of both set the `min_amount` to the min amount acceptable
 *   and the `amount_bp` to the percentage of the purchase price. The higher of the
 *   two will be used.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/kiosk::royalty_rule';
export const Rule = new MoveStruct({
	name: `${$moduleName}::Rule`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const Config = new MoveStruct({
	name: `${$moduleName}::Config`,
	fields: {
		amount_bp: bcs.u16(),
		min_amount: bcs.u64(),
	},
});
export interface AddArguments {
	policy: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	amountBp: RawTransactionArgument<number>;
	minAmount: RawTransactionArgument<number | bigint>;
}
export interface AddOptions {
	package?: string;
	arguments:
		| AddArguments
		| [
				policy: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				amountBp: RawTransactionArgument<number>,
				minAmount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Creator action: Add the Royalty Rule for the `T`. Pass in the `TransferPolicy`,
 * `TransferPolicyCap` and the configuration for the policy: `amount_bp` and
 * `min_amount`.
 */
export function add(options: AddOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		`0x0000000000000000000000000000000000000000000000000000000000000002::transfer_policy::TransferPolicy<${options.typeArguments[0]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::transfer_policy::TransferPolicyCap<${options.typeArguments[0]}>`,
		'u16',
		'u64',
	] satisfies string[];
	const parameterNames = ['policy', 'cap', 'amountBp', 'minAmount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'royalty_rule',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PayArguments {
	policy: RawTransactionArgument<string>;
	request: RawTransactionArgument<string>;
	payment: RawTransactionArgument<string>;
}
export interface PayOptions {
	package?: string;
	arguments:
		| PayArguments
		| [
				policy: RawTransactionArgument<string>,
				request: RawTransactionArgument<string>,
				payment: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Buyer action: Pay the royalty fee for the transfer. */
export function pay(options: PayOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		`0x0000000000000000000000000000000000000000000000000000000000000002::transfer_policy::TransferPolicy<${options.typeArguments[0]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::transfer_policy::TransferRequest<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
	] satisfies string[];
	const parameterNames = ['policy', 'request', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'royalty_rule',
			function: 'pay',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FeeAmountArguments {
	policy: RawTransactionArgument<string>;
	paid: RawTransactionArgument<number | bigint>;
}
export interface FeeAmountOptions {
	package?: string;
	arguments:
		| FeeAmountArguments
		| [policy: RawTransactionArgument<string>, paid: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Helper function to calculate the amount to be paid for the transfer. Can be used
 * dry-runned to estimate the fee amount based on the Kiosk listing price.
 */
export function feeAmount(options: FeeAmountOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		`0x0000000000000000000000000000000000000000000000000000000000000002::transfer_policy::TransferPolicy<${options.typeArguments[0]}>`,
		'u64',
	] satisfies string[];
	const parameterNames = ['policy', 'paid'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'royalty_rule',
			function: 'fee_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
