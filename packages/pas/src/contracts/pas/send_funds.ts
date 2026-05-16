/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@mysten/pas::send_funds';
/**
 * A transfer request that is generated once a send funds request is initialized.
 *
 * A hot potato that is issued when a transfer is initiated. It can only be
 * resolved by presenting a witness `U` that is the witness of `Policy<T>`
 *
 * This enables the `resolve` function of each smart contract to be flexible and
 * implement its own mechanisms for validation. The individual resolution module
 * can:
 *
 * - Check whitelists/blacklists
 * - Enforce holding periods
 * - Collect fees
 * - Emit regulatory events
 * - Handle dividends/distributions
 * - Implement any jurisdiction-specific rules
 */
export function SendFunds<T extends BcsType<any>>(...typeParameters: [T]) {
	return new MoveStruct({
		name: `${$moduleName}::SendFunds<${typeParameters[0].name as T['name']}>`,
		fields: {
			/** `sender` is the wallet OR object address, NOT the account address */
			sender: bcs.Address,
			/** `recipient` is the wallet OR object address, NOT the account address */
			recipient: bcs.Address,
			/** The ID of the account the funds are coming from */
			sender_account_id: bcs.Address,
			/** The ID of the account the funds are going to */
			recipient_account_id: bcs.Address,
			/** The balance being transferred */
			funds: typeParameters[0],
		},
	});
}
export interface SenderArguments {
	request: TransactionArgument;
}
export interface SenderOptions {
	package?: string;
	arguments: SenderArguments | [request: TransactionArgument];
	typeArguments: [string];
}
export function sender(options: SenderOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'send_funds',
			function: 'sender',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RecipientArguments {
	request: TransactionArgument;
}
export interface RecipientOptions {
	package?: string;
	arguments: RecipientArguments | [request: TransactionArgument];
	typeArguments: [string];
}
export function recipient(options: RecipientOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'send_funds',
			function: 'recipient',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SenderAccountIdArguments {
	request: TransactionArgument;
}
export interface SenderAccountIdOptions {
	package?: string;
	arguments: SenderAccountIdArguments | [request: TransactionArgument];
	typeArguments: [string];
}
export function senderAccountId(options: SenderAccountIdOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'send_funds',
			function: 'sender_account_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RecipientAccountIdArguments {
	request: TransactionArgument;
}
export interface RecipientAccountIdOptions {
	package?: string;
	arguments: RecipientAccountIdArguments | [request: TransactionArgument];
	typeArguments: [string];
}
export function recipientAccountId(options: RecipientAccountIdOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'send_funds',
			function: 'recipient_account_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FundsArguments {
	request: TransactionArgument;
}
export interface FundsOptions {
	package?: string;
	arguments: FundsArguments | [request: TransactionArgument];
	typeArguments: [string];
}
export function funds(options: FundsOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'send_funds',
			function: 'funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ResolveBalanceArguments {
	request: TransactionArgument;
	policy: RawTransactionArgument<string>;
}
export interface ResolveBalanceOptions {
	package?: string;
	arguments:
		| ResolveBalanceArguments
		| [request: TransactionArgument, policy: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * resolve a transfer request, if funds management is enabled & there are enough
 * approvals.
 */
export function resolveBalance(options: ResolveBalanceOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['request', 'policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'send_funds',
			function: 'resolve_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
