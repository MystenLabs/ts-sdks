/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import {
	type Transaction,
	type TransactionResult,
	type TransactionArgument,
} from '@mysten/sui/transactions';
import * as vec_set from './vec_set.js';
import * as type_name from './deps/0x0000000000000000000000000000000000000000000000000000000000000001/type_name.js';
import * as balance from './balance.js';
const $moduleName = '0x2::transfer_policy';
export const TransferRequest: MoveStruct<{
	item: typeof bcs.Address;
	paid: ReturnType<typeof bcs.u64>;
	from: typeof bcs.Address;
	receipts: ReturnType<typeof vec_set.VecSet<typeof type_name.TypeName>>;
}> = new MoveStruct({
	name: `${$moduleName}::TransferRequest<phantom T0>`,
	fields: {
		item: bcs.Address,
		paid: bcs.u64(),
		from: bcs.Address,
		receipts: vec_set.VecSet(type_name.TypeName),
	},
});
export const TransferPolicy: MoveStruct<{
	id: typeof bcs.Address;
	balance: typeof balance.Balance;
	rules: ReturnType<typeof vec_set.VecSet<typeof type_name.TypeName>>;
}> = new MoveStruct({
	name: `${$moduleName}::TransferPolicy<phantom T0>`,
	fields: {
		id: bcs.Address,
		balance: balance.Balance,
		rules: vec_set.VecSet(type_name.TypeName),
	},
});
export const TransferPolicyCap: MoveStruct<{
	id: typeof bcs.Address;
	policy_id: typeof bcs.Address;
}> = new MoveStruct({
	name: `${$moduleName}::TransferPolicyCap<phantom T0>`,
	fields: {
		id: bcs.Address,
		policy_id: bcs.Address,
	},
});
export const TransferPolicyCreated: MoveStruct<{
	id: typeof bcs.Address;
}> = new MoveStruct({
	name: `${$moduleName}::TransferPolicyCreated<phantom T0>`,
	fields: {
		id: bcs.Address,
	},
});
export const TransferPolicyDestroyed: MoveStruct<{
	id: typeof bcs.Address;
}> = new MoveStruct({
	name: `${$moduleName}::TransferPolicyDestroyed<phantom T0>`,
	fields: {
		id: bcs.Address,
	},
});
export const RuleKey: MoveStruct<{
	dummy_field: ReturnType<typeof bcs.bool>;
}> = new MoveStruct({
	name: `${$moduleName}::RuleKey<phantom T0>`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface NewRequestOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function newRequest(options: NewRequestOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['0x2::object::ID', 'u64', '0x2::object::ID'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'new_request',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface NewOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function _new(options: NewOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DefaultOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function _default(options: DefaultOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'default',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint | null>,
	];
	typeArguments: [string];
}
export function withdraw(options: WithdrawOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, '0x1::option::Option<u64>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DestroyAndWithdrawOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function destroyAndWithdraw(
	options: DestroyAndWithdrawOptions,
): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'destroy_and_withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ConfirmRequestOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, TransactionArgument];
	typeArguments: [string];
}
export function confirmRequest(
	options: ConfirmRequestOptions,
): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'confirm_request',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface AddRuleOptions<T1 extends BcsType<any>, T2 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<T1>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<T2>,
	];
	typeArguments: [string, string, string];
}
export function addRule<T1 extends BcsType<any>, T2 extends BcsType<any>>(
	options: AddRuleOptions<T1, T2>,
): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${options.typeArguments[1]}`,
		null,
		null,
		`${options.typeArguments[2]}`,
	] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'add_rule',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface GetRuleOptions<T1 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T1>, RawTransactionArgument<string>];
	typeArguments: [string, string, string];
}
export function getRule<T1 extends BcsType<any>>(
	options: GetRuleOptions<T1>,
): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[1]}`, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'get_rule',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface AddToBalanceOptions<T1 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<T1>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string, string];
}
export function addToBalance<T1 extends BcsType<any>>(
	options: AddToBalanceOptions<T1>,
): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[1]}`, null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'add_to_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface AddReceiptOptions<T1 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T1>, TransactionArgument];
	typeArguments: [string, string];
}
export function addReceipt<T1 extends BcsType<any>>(
	options: AddReceiptOptions<T1>,
): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[1]}`, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'add_receipt',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface HasRuleOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function hasRule(options: HasRuleOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'has_rule',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveRuleOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string, string, string];
}
export function removeRule(options: RemoveRuleOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'remove_rule',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface UidOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function uid(options: UidOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'uid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface UidMutAsOwnerOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function uidMutAsOwner(
	options: UidMutAsOwnerOptions,
): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'uid_mut_as_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RulesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function rules(options: RulesOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'rules',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ItemOptions {
	package?: string;
	arguments: [TransactionArgument];
	typeArguments: [string];
}
export function item(options: ItemOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'item',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PaidOptions {
	package?: string;
	arguments: [TransactionArgument];
	typeArguments: [string];
}
export function paid(options: PaidOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'paid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface FromOptions {
	package?: string;
	arguments: [TransactionArgument];
	typeArguments: [string];
}
export function _from(options: FromOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'from',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
