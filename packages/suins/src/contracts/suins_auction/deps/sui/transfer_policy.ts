/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines the `TransferPolicy` type and the logic to approve `TransferRequest`s.
 *
 * - TransferPolicy - is a highly customizable primitive, which provides an
 *   interface for the type owner to set custom transfer rules for every deal
 *   performed in the `Kiosk` or a similar system that integrates with TP.
 *
 * - Once a `TransferPolicy<T>` is created for and shared (or frozen), the type `T`
 *   becomes tradable in `Kiosk`s. On every purchase operation, a `TransferRequest`
 *   is created and needs to be confirmed by the `TransferPolicy` hot potato or
 *   transaction will fail.
 *
 * - Type owner (creator) can set any Rules as long as the ecosystem supports them.
 *   All of the Rules need to be resolved within a single transaction (eg pay
 *   royalty and pay fixed commission). Once required actions are performed, the
 *   `TransferRequest` can be "confirmed" via `confirm_request` call.
 *
 * - `TransferPolicy` aims to be the main interface for creators to control trades
 *   of their types and collect profits if a fee is required on sales. Custom
 *   policies can be removed at any moment, and the change will affect all
 *   instances of the type at once.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_set from './vec_set.js';
import * as type_name from '../suins_auction/type_name.js';
import * as balance from './balance.js';
const $moduleName = '0x2::transfer_policy';
export const TransferRequest = new MoveStruct({
	name: `${$moduleName}::TransferRequest<phantom T>`,
	fields: {
		/**
		 * The ID of the transferred item. Although the `T` has no constraints, the main
		 * use case for this module is to work with Objects.
		 */
		item: bcs.Address,
		/**
		 * Amount of SUI paid for the item. Can be used to calculate the fee / transfer
		 * policy enforcement.
		 */
		paid: bcs.u64(),
		/**
		 * The ID of the Kiosk / Safe the object is being sold from. Can be used by the
		 * TransferPolicy implementors.
		 */
		from: bcs.Address,
		/**
		 * Collected Receipts. Used to verify that all of the rules were followed and
		 * `TransferRequest` can be confirmed.
		 */
		receipts: vec_set.VecSet(type_name.TypeName),
	},
});
export const TransferPolicy = new MoveStruct({
	name: `${$moduleName}::TransferPolicy<phantom T>`,
	fields: {
		id: bcs.Address,
		/**
		 * The Balance of the `TransferPolicy` which collects `SUI`. By default, transfer
		 * policy does not collect anything , and it's a matter of an implementation of a
		 * specific rule - whether to add to balance and how much.
		 */
		balance: balance.Balance,
		/**
		 * Set of types of attached rules - used to verify `receipts` when a
		 * `TransferRequest` is received in `confirm_request` function.
		 *
		 * Additionally provides a way to look up currently attached Rules.
		 */
		rules: vec_set.VecSet(type_name.TypeName),
	},
});
export const TransferPolicyCap = new MoveStruct({
	name: `${$moduleName}::TransferPolicyCap<phantom T>`,
	fields: {
		id: bcs.Address,
		policy_id: bcs.Address,
	},
});
export const TransferPolicyCreated = new MoveStruct({
	name: `${$moduleName}::TransferPolicyCreated<phantom T>`,
	fields: {
		id: bcs.Address,
	},
});
export const TransferPolicyDestroyed = new MoveStruct({
	name: `${$moduleName}::TransferPolicyDestroyed<phantom T>`,
	fields: {
		id: bcs.Address,
	},
});
export const RuleKey = new MoveStruct({
	name: `${$moduleName}::RuleKey<phantom T>`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface NewRequestArguments {
	item: RawTransactionArgument<string>;
	paid: RawTransactionArgument<number | bigint>;
	from: RawTransactionArgument<string>;
}
export interface NewRequestOptions {
	package: string;
	arguments:
		| NewRequestArguments
		| [
				item: RawTransactionArgument<string>,
				paid: RawTransactionArgument<number | bigint>,
				from: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Construct a new `TransferRequest` hot potato which requires an approving action
 * from the creator to be destroyed / resolved. Once created, it must be confirmed
 * in the `confirm_request` call otherwise the transaction will fail.
 */
export function newRequest(options: NewRequestOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID', 'u64', '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['item', 'paid', 'from'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'new_request',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewArguments {
	pub: RawTransactionArgument<string>;
}
export interface NewOptions {
	package: string;
	arguments: NewArguments | [pub: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Register a type in the Kiosk system and receive a `TransferPolicy` and a
 * `TransferPolicyCap` for the type. The `TransferPolicy` is required to confirm
 * kiosk deals for the `T`. If there's no `TransferPolicy` available for use, the
 * type can not be traded in kiosks.
 */
export function _new(options: NewOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pub'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DefaultArguments {
	pub: RawTransactionArgument<string>;
}
export interface DefaultOptions {
	package: string;
	arguments: DefaultArguments | [pub: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Initialize the Transfer Policy in the default scenario: Create and share the
 * `TransferPolicy`, transfer `TransferPolicyCap` to the transaction sender.
 */
export function _default(options: DefaultOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pub'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'default',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint | null>;
}
export interface WithdrawOptions {
	package: string;
	arguments:
		| WithdrawArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint | null>,
		  ];
	typeArguments: [string];
}
/**
 * Withdraw some amount of profits from the `TransferPolicy`. If amount is not
 * specified, all profits are withdrawn.
 */
export function withdraw(options: WithdrawOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::option::Option<u64>'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DestroyAndWithdrawArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface DestroyAndWithdrawOptions {
	package: string;
	arguments:
		| DestroyAndWithdrawArguments
		| [self: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Destroy a TransferPolicyCap. Can be performed by any party as long as they own
 * it.
 */
export function destroyAndWithdraw(options: DestroyAndWithdrawOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'destroy_and_withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ConfirmRequestArguments {
	self: RawTransactionArgument<string>;
	request: RawTransactionArgument<string>;
}
export interface ConfirmRequestOptions {
	package: string;
	arguments:
		| ConfirmRequestArguments
		| [self: RawTransactionArgument<string>, request: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Allow a `TransferRequest` for the type `T`. The call is protected by the type
 * constraint, as only the publisher of the `T` can get `TransferPolicy<T>`.
 *
 * Note: unless there's a policy for `T` to allow transfers, Kiosk trades will not
 * be possible.
 */
export function confirmRequest(options: ConfirmRequestOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'confirm_request',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AddRuleArguments<Rule extends BcsType<any>, Config extends BcsType<any>> {
	_: RawTransactionArgument<Rule>;
	policy: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	cfg: RawTransactionArgument<Config>;
}
export interface AddRuleOptions<Rule extends BcsType<any>, Config extends BcsType<any>> {
	package: string;
	arguments:
		| AddRuleArguments<Rule, Config>
		| [
				_: RawTransactionArgument<Rule>,
				policy: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				cfg: RawTransactionArgument<Config>,
		  ];
	typeArguments: [string, string, string];
}
/**
 * Add a custom Rule to the `TransferPolicy`. Once set, `TransferRequest` must
 * receive a confirmation of the rule executed so the hot potato can be unpacked.
 *
 * - T: the type to which TransferPolicy<T> is applied.
 * - Rule: the witness type for the Custom rule
 * - Config: a custom configuration for the rule
 *
 * Config requires `drop` to allow creators to remove any policy at any moment,
 * even if graceful unpacking has not been implemented in a "rule module".
 */
export function addRule<Rule extends BcsType<any>, Config extends BcsType<any>>(
	options: AddRuleOptions<Rule, Config>,
) {
	const packageAddress = options.package;
	const argumentsTypes = [
		`${options.typeArguments[1]}`,
		null,
		null,
		`${options.typeArguments[2]}`,
	] satisfies (string | null)[];
	const parameterNames = ['_', 'policy', 'cap', 'cfg'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'add_rule',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetRuleArguments<Rule extends BcsType<any>> {
	_: RawTransactionArgument<Rule>;
	policy: RawTransactionArgument<string>;
}
export interface GetRuleOptions<Rule extends BcsType<any>> {
	package: string;
	arguments:
		| GetRuleArguments<Rule>
		| [_: RawTransactionArgument<Rule>, policy: RawTransactionArgument<string>];
	typeArguments: [string, string, string];
}
/** Get the custom Config for the Rule (can be only one per "Rule" type). */
export function getRule<Rule extends BcsType<any>>(options: GetRuleOptions<Rule>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[1]}`, null] satisfies (string | null)[];
	const parameterNames = ['_', 'policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'get_rule',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AddToBalanceArguments<Rule extends BcsType<any>> {
	_: RawTransactionArgument<Rule>;
	policy: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface AddToBalanceOptions<Rule extends BcsType<any>> {
	package: string;
	arguments:
		| AddToBalanceArguments<Rule>
		| [
				_: RawTransactionArgument<Rule>,
				policy: RawTransactionArgument<string>,
				coin: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Add some `SUI` to the balance of a `TransferPolicy`. */
export function addToBalance<Rule extends BcsType<any>>(options: AddToBalanceOptions<Rule>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[1]}`, null, null] satisfies (string | null)[];
	const parameterNames = ['_', 'policy', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'add_to_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AddReceiptArguments<Rule extends BcsType<any>> {
	_: RawTransactionArgument<Rule>;
	request: RawTransactionArgument<string>;
}
export interface AddReceiptOptions<Rule extends BcsType<any>> {
	package: string;
	arguments:
		| AddReceiptArguments<Rule>
		| [_: RawTransactionArgument<Rule>, request: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Adds a `Receipt` to the `TransferRequest`, unblocking the request and confirming
 * that the policy requirements are satisfied.
 */
export function addReceipt<Rule extends BcsType<any>>(options: AddReceiptOptions<Rule>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[1]}`, null] satisfies (string | null)[];
	const parameterNames = ['_', 'request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'add_receipt',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface HasRuleArguments {
	policy: RawTransactionArgument<string>;
}
export interface HasRuleOptions {
	package: string;
	arguments: HasRuleArguments | [policy: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Check whether a custom rule has been added to the `TransferPolicy`. */
export function hasRule(options: HasRuleOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'has_rule',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveRuleArguments {
	policy: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface RemoveRuleOptions {
	package: string;
	arguments:
		| RemoveRuleArguments
		| [policy: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string, string, string];
}
/** Remove the Rule from the `TransferPolicy`. */
export function removeRule(options: RemoveRuleOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['policy', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'remove_rule',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UidArguments {
	self: RawTransactionArgument<string>;
}
export interface UidOptions {
	package: string;
	arguments: UidArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Allows reading custom attachments to the `TransferPolicy` if there are any. */
export function uid(options: UidOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'uid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UidMutAsOwnerArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface UidMutAsOwnerOptions {
	package: string;
	arguments:
		| UidMutAsOwnerArguments
		| [self: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Get a mutable reference to the `self.id` to enable custom attachments to the
 * `TransferPolicy`.
 */
export function uidMutAsOwner(options: UidMutAsOwnerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'uid_mut_as_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RulesArguments {
	self: RawTransactionArgument<string>;
}
export interface RulesOptions {
	package: string;
	arguments: RulesArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Read the `rules` field from the `TransferPolicy`. */
export function rules(options: RulesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'rules',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ItemArguments {
	self: RawTransactionArgument<string>;
}
export interface ItemOptions {
	package: string;
	arguments: ItemArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the `item` field of the `TransferRequest`. */
export function item(options: ItemOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'item',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PaidArguments {
	self: RawTransactionArgument<string>;
}
export interface PaidOptions {
	package: string;
	arguments: PaidArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the `paid` field of the `TransferRequest`. */
export function paid(options: PaidOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'paid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FromArguments {
	self: RawTransactionArgument<string>;
}
export interface FromOptions {
	package: string;
	arguments: FromArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the `from` field of the `TransferRequest`. */
export function _from(options: FromOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer_policy',
			function: 'from',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
