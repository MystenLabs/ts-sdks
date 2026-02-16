/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The Token module which implements a Closed Loop Token with a configurable
 * policy. The policy is defined by a set of rules that must be satisfied for an
 * action to be performed on the token.
 *
 * The module is designed to be used with a `TreasuryCap` to allow for minting and
 * burning of the `Token`s. And can act as a replacement / extension or a companion
 * to existing open-loop (`Coin`) systems.
 *
 * ```
 * Module:      sui::balance       sui::coin             sui::token
 * Main type:   Balance<T>         Coin<T>               Token<T>
 * Capability:  Supply<T>  <---->  TreasuryCap<T> <----> TreasuryCap<T>
 * Abilities:   store              key + store           key
 * ```
 *
 * The Token system allows for fine-grained control over the actions performed on
 * the token. And hence it is highly suitable for applications that require control
 * over the currency which a simple open-loop system can't provide.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as balance from './balance.js';
import * as vec_map from './vec_map.js';
import * as vec_set from './vec_set.js';
import * as type_name from '../suins_auction/type_name.js';
const $moduleName = '0x2::token';
export const Token = new MoveStruct({
	name: `${$moduleName}::Token<phantom T>`,
	fields: {
		id: bcs.Address,
		/** The Balance of the `Token`. */
		balance: balance.Balance,
	},
});
export const TokenPolicyCap = new MoveStruct({
	name: `${$moduleName}::TokenPolicyCap<phantom T>`,
	fields: {
		id: bcs.Address,
		for: bcs.Address,
	},
});
export const TokenPolicy = new MoveStruct({
	name: `${$moduleName}::TokenPolicy<phantom T>`,
	fields: {
		id: bcs.Address,
		/**
		 * The balance that is effectively spent by the user on the "spend" action.
		 * However, actual decrease of the supply can only be done by the `TreasuryCap`
		 * owner when `flush` is called.
		 *
		 * This balance is effectively spent and cannot be accessed by anyone but the
		 * `TreasuryCap` owner.
		 */
		spent_balance: balance.Balance,
		/**
		 * The set of rules that define what actions can be performed on the token. For
		 * each "action" there's a set of Rules that must be satisfied for the
		 * `ActionRequest` to be confirmed.
		 */
		rules: vec_map.VecMap(bcs.string(), vec_set.VecSet(type_name.TypeName)),
	},
});
export const ActionRequest = new MoveStruct({
	name: `${$moduleName}::ActionRequest<phantom T>`,
	fields: {
		/**
		 * Name of the Action to look up in the Policy. Name can be one of the default
		 * actions: `transfer`, `spend`, `to_coin`, `from_coin` or a custom action.
		 */
		name: bcs.string(),
		/** Amount is present in all of the txs */
		amount: bcs.u64(),
		/** Sender is a permanent field always */
		sender: bcs.Address,
		/** Recipient is only available in `transfer` action. */
		recipient: bcs.option(bcs.Address),
		/**
		 * The balance to be "spent" in the `TokenPolicy`, only available in the `spend`
		 * action.
		 */
		spent_balance: bcs.option(balance.Balance),
		/**
		 * Collected approvals (stamps) from completed `Rules`. They're matched against
		 * `TokenPolicy.rules` to determine if the request can be confirmed.
		 */
		approvals: vec_set.VecSet(type_name.TypeName),
	},
});
export const RuleKey = new MoveStruct({
	name: `${$moduleName}::RuleKey<phantom T>`,
	fields: {
		is_protected: bcs.bool(),
	},
});
export const TokenPolicyCreated = new MoveStruct({
	name: `${$moduleName}::TokenPolicyCreated<phantom T>`,
	fields: {
		/** ID of the `TokenPolicy` that was created. */
		id: bcs.Address,
		/** Whether the `TokenPolicy` is "shared" (mutable) or "frozen" (immutable) - TBD. */
		is_mutable: bcs.bool(),
	},
});
export interface NewPolicyArguments {
	TreasuryCap: RawTransactionArgument<string>;
}
export interface NewPolicyOptions {
	package: string;
	arguments: NewPolicyArguments | [TreasuryCap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Create a new `TokenPolicy` and a matching `TokenPolicyCap`. The `TokenPolicy`
 * must then be shared using the `share_policy` method.
 *
 * `TreasuryCap` guarantees full ownership over the currency, and is unique, hence
 * it is safe to use it for authorization.
 */
export function newPolicy(options: NewPolicyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['TreasuryCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'new_policy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SharePolicyArguments {
	policy: RawTransactionArgument<string>;
}
export interface SharePolicyOptions {
	package: string;
	arguments: SharePolicyArguments | [policy: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Share the `TokenPolicy`. Due to `key`-only restriction, it must be shared after
 * initialization.
 */
export function sharePolicy(options: SharePolicyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'share_policy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface TransferArguments {
	t: RawTransactionArgument<string>;
	recipient: RawTransactionArgument<string>;
}
export interface TransferOptions {
	package: string;
	arguments:
		| TransferArguments
		| [t: RawTransactionArgument<string>, recipient: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Transfer a `Token` to a `recipient`. Creates an `ActionRequest` for the
 * "transfer" action. The `ActionRequest` contains the `recipient` field to be used
 * in verification.
 */
export function transfer(options: TransferOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['t', 'recipient'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SpendArguments {
	t: RawTransactionArgument<string>;
}
export interface SpendOptions {
	package: string;
	arguments: SpendArguments | [t: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Spend a `Token` by unwrapping it and storing the `Balance` in the
 * `ActionRequest` for the "spend" action. The `ActionRequest` contains the
 * `spent_balance` field to be used in verification.
 *
 * Spend action requires `confirm_request_mut` to be called to confirm the request
 * and join the spent balance with the `TokenPolicy.spent_balance`.
 */
export function spend(options: SpendOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'spend',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ToCoinArguments {
	t: RawTransactionArgument<string>;
}
export interface ToCoinOptions {
	package: string;
	arguments: ToCoinArguments | [t: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Convert `Token` into an open `Coin`. Creates an `ActionRequest` for the
 * "to_coin" action.
 */
export function toCoin(options: ToCoinOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'to_coin',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FromCoinArguments {
	coin: RawTransactionArgument<string>;
}
export interface FromCoinOptions {
	package: string;
	arguments: FromCoinArguments | [coin: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Convert an open `Coin` into a `Token`. Creates an `ActionRequest` for the
 * "from_coin" action.
 */
export function fromCoin(options: FromCoinOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'from_coin',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface JoinArguments {
	token: RawTransactionArgument<string>;
	another: RawTransactionArgument<string>;
}
export interface JoinOptions {
	package: string;
	arguments:
		| JoinArguments
		| [token: RawTransactionArgument<string>, another: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Join two `Token`s into one, always available. */
export function join(options: JoinOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['token', 'another'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'join',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SplitArguments {
	token: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface SplitOptions {
	package: string;
	arguments:
		| SplitArguments
		| [token: RawTransactionArgument<string>, amount: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Split a `Token` with `amount`. Aborts if the `Token.balance` is lower than
 * `amount`.
 */
export function split(options: SplitOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['token', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'split',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ZeroOptions {
	package: string;
	arguments?: [];
	typeArguments: [string];
}
/** Create a zero `Token`. */
export function zero(options: ZeroOptions) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'zero',
			typeArguments: options.typeArguments,
		});
}
export interface DestroyZeroArguments {
	token: RawTransactionArgument<string>;
}
export interface DestroyZeroOptions {
	package: string;
	arguments: DestroyZeroArguments | [token: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Destroy an empty `Token`, fails if the balance is non-zero. Aborts if the
 * `Token.balance` is not zero.
 */
export function destroyZero(options: DestroyZeroOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['token'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'destroy_zero',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface KeepArguments {
	token: RawTransactionArgument<string>;
}
export interface KeepOptions {
	package: string;
	arguments: KeepArguments | [token: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Transfer the `Token` to the transaction sender. */
export function keep(options: KeepOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['token'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'keep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewRequestArguments {
	name: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
	recipient: RawTransactionArgument<string | null>;
	spentBalance: RawTransactionArgument<string | null>;
}
export interface NewRequestOptions {
	package: string;
	arguments:
		| NewRequestArguments
		| [
				name: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				recipient: RawTransactionArgument<string | null>,
				spentBalance: RawTransactionArgument<string | null>,
		  ];
	typeArguments: [string];
}
/**
 * Create a new `ActionRequest`. Publicly available method to allow for custom
 * actions.
 */
export function newRequest(options: NewRequestOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [
		'0x1::string::String',
		'u64',
		'0x1::option::Option<address>',
		'0x1::option::Option<null>',
	] satisfies (string | null)[];
	const parameterNames = ['name', 'amount', 'recipient', 'spentBalance'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'new_request',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ConfirmRequestArguments {
	policy: RawTransactionArgument<string>;
	request: RawTransactionArgument<string>;
}
export interface ConfirmRequestOptions {
	package: string;
	arguments:
		| ConfirmRequestArguments
		| [policy: RawTransactionArgument<string>, request: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Confirm the request against the `TokenPolicy` and return the parameters of the
 * request: (Name, Amount, Sender, Recipient).
 *
 * Cannot be used for `spend` and similar actions that deliver `spent_balance` to
 * the `TokenPolicy`. For those actions use `confirm_request_mut`.
 *
 * Aborts if:
 *
 * - the action is not allowed (missing record in `rules`)
 * - action contains `spent_balance` (use `confirm_request_mut`)
 * - the `ActionRequest` does not meet the `TokenPolicy` rules for the action
 */
export function confirmRequest(options: ConfirmRequestOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['policy', 'request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'confirm_request',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ConfirmRequestMutArguments {
	policy: RawTransactionArgument<string>;
	request: RawTransactionArgument<string>;
}
export interface ConfirmRequestMutOptions {
	package: string;
	arguments:
		| ConfirmRequestMutArguments
		| [policy: RawTransactionArgument<string>, request: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Confirm the request against the `TokenPolicy` and return the parameters of the
 * request: (Name, Amount, Sender, Recipient).
 *
 * Unlike `confirm_request` this function requires mutable access to the
 * `TokenPolicy` and must be used on `spend` action. After dealing with the spent
 * balance it calls `confirm_request` internally.
 *
 * See `confirm_request` for the list of abort conditions.
 */
export function confirmRequestMut(options: ConfirmRequestMutOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['policy', 'request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'confirm_request_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ConfirmWithPolicyCapArguments {
	PolicyCap: RawTransactionArgument<string>;
	request: RawTransactionArgument<string>;
}
export interface ConfirmWithPolicyCapOptions {
	package: string;
	arguments:
		| ConfirmWithPolicyCapArguments
		| [PolicyCap: RawTransactionArgument<string>, request: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Confirm an `ActionRequest` as the `TokenPolicyCap` owner. This function allows
 * `TokenPolicy` owner to perform Capability-gated actions ignoring the ruleset
 * specified in the `TokenPolicy`.
 *
 * Aborts if request contains `spent_balance` due to inability of the
 * `TokenPolicyCap` to decrease supply. For scenarios like this a `TreasuryCap` is
 * required (see `confirm_with_treasury_cap`).
 */
export function confirmWithPolicyCap(options: ConfirmWithPolicyCapOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['PolicyCap', 'request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'confirm_with_policy_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ConfirmWithTreasuryCapArguments {
	treasuryCap: RawTransactionArgument<string>;
	request: RawTransactionArgument<string>;
}
export interface ConfirmWithTreasuryCapOptions {
	package: string;
	arguments:
		| ConfirmWithTreasuryCapArguments
		| [treasuryCap: RawTransactionArgument<string>, request: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Confirm an `ActionRequest` as the `TreasuryCap` owner. This function allows
 * `TreasuryCap` owner to perform Capability-gated actions ignoring the ruleset
 * specified in the `TokenPolicy`.
 *
 * Unlike `confirm_with_policy_cap` this function allows `spent_balance` to be
 * consumed, decreasing the `total_supply` of the `Token`.
 */
export function confirmWithTreasuryCap(options: ConfirmWithTreasuryCapOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['treasuryCap', 'request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'confirm_with_treasury_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AddApprovalArguments<W extends BcsType<any>> {
	T: RawTransactionArgument<W>;
	request: RawTransactionArgument<string>;
}
export interface AddApprovalOptions<W extends BcsType<any>> {
	package: string;
	arguments:
		| AddApprovalArguments<W>
		| [T: RawTransactionArgument<W>, request: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Add an "approval" to the `ActionRequest` by providing a Witness. Intended to be
 * used by Rules to add their own approvals, however, can be used to add arbitrary
 * approvals to the request (not only the ones required by the `TokenPolicy`).
 */
export function addApproval<W extends BcsType<any>>(options: AddApprovalOptions<W>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[1]}`, null] satisfies (string | null)[];
	const parameterNames = ['T', 'request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'add_approval',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AddRuleConfigArguments<Rule extends BcsType<any>, Config extends BcsType<any>> {
	Rule: RawTransactionArgument<Rule>;
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	config: RawTransactionArgument<Config>;
}
export interface AddRuleConfigOptions<Rule extends BcsType<any>, Config extends BcsType<any>> {
	package: string;
	arguments:
		| AddRuleConfigArguments<Rule, Config>
		| [
				Rule: RawTransactionArgument<Rule>,
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				config: RawTransactionArgument<Config>,
		  ];
	typeArguments: [string, string, string];
}
/**
 * Add a `Config` for a `Rule` in the `TokenPolicy`. Rule configuration is
 * independent from the `TokenPolicy.rules` and needs to be managed by the Rule
 * itself. Configuration is stored per `Rule` and not per `Rule` per `Action` to
 * allow reuse in different actions.
 *
 * - Rule witness guarantees that the `Config` is approved by the Rule.
 * - `TokenPolicyCap` guarantees that the `Config` setup is initiated by the
 *   `TokenPolicy` owner.
 */
export function addRuleConfig<Rule extends BcsType<any>, Config extends BcsType<any>>(
	options: AddRuleConfigOptions<Rule, Config>,
) {
	const packageAddress = options.package;
	const argumentsTypes = [
		`${options.typeArguments[1]}`,
		null,
		null,
		`${options.typeArguments[2]}`,
	] satisfies (string | null)[];
	const parameterNames = ['Rule', 'self', 'cap', 'config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'add_rule_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RuleConfigArguments<Rule extends BcsType<any>> {
	Rule: RawTransactionArgument<Rule>;
	self: RawTransactionArgument<string>;
}
export interface RuleConfigOptions<Rule extends BcsType<any>> {
	package: string;
	arguments:
		| RuleConfigArguments<Rule>
		| [Rule: RawTransactionArgument<Rule>, self: RawTransactionArgument<string>];
	typeArguments: [string, string, string];
}
/**
 * Get a `Config` for a `Rule` in the `TokenPolicy`. Requires `Rule` witness, hence
 * can only be read by the `Rule` itself. This requirement guarantees safety of the
 * stored `Config` and allows for simpler dynamic field management inside the Rule
 * Config (custom type keys are not needed for access gating).
 *
 * Aborts if the Config is not present.
 */
export function ruleConfig<Rule extends BcsType<any>>(options: RuleConfigOptions<Rule>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[1]}`, null] satisfies (string | null)[];
	const parameterNames = ['Rule', 'self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'rule_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RuleConfigMutArguments<Rule extends BcsType<any>> {
	Rule: RawTransactionArgument<Rule>;
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface RuleConfigMutOptions<Rule extends BcsType<any>> {
	package: string;
	arguments:
		| RuleConfigMutArguments<Rule>
		| [
				Rule: RawTransactionArgument<Rule>,
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string, string];
}
/**
 * Get mutable access to the `Config` for a `Rule` in the `TokenPolicy`. Requires
 * `Rule` witness, hence can only be read by the `Rule` itself, as well as
 * `TokenPolicyCap` to guarantee that the `TokenPolicy` owner is the one who
 * initiated the `Config` modification.
 *
 * Aborts if:
 *
 * - the Config is not present
 * - `TokenPolicyCap` is not matching the `TokenPolicy`
 */
export function ruleConfigMut<Rule extends BcsType<any>>(options: RuleConfigMutOptions<Rule>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[1]}`, null, null] satisfies (string | null)[];
	const parameterNames = ['Rule', 'self', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'rule_config_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveRuleConfigArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface RemoveRuleConfigOptions {
	package: string;
	arguments:
		| RemoveRuleConfigArguments
		| [self: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string, string, string];
}
/**
 * Remove a `Config` for a `Rule` in the `TokenPolicy`. Unlike the
 * `add_rule_config`, this function does not require a `Rule` witness, hence can be
 * performed by the `TokenPolicy` owner on their own.
 *
 * Rules need to make sure that the `Config` is present when performing
 * verification of the `ActionRequest`.
 *
 * Aborts if:
 *
 * - the Config is not present
 * - `TokenPolicyCap` is not matching the `TokenPolicy`
 */
export function removeRuleConfig(options: RemoveRuleConfigOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'remove_rule_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface HasRuleConfigArguments {
	self: RawTransactionArgument<string>;
}
export interface HasRuleConfigOptions {
	package: string;
	arguments: HasRuleConfigArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Check if a config for a `Rule` is set in the `TokenPolicy` without checking the
 * type of the `Config`.
 */
export function hasRuleConfig(options: HasRuleConfigOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'has_rule_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface HasRuleConfigWithTypeArguments {
	self: RawTransactionArgument<string>;
}
export interface HasRuleConfigWithTypeOptions {
	package: string;
	arguments: HasRuleConfigWithTypeArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string, string];
}
/**
 * Check if a `Config` for a `Rule` is set in the `TokenPolicy` and that it matches
 * the type provided.
 */
export function hasRuleConfigWithType(options: HasRuleConfigWithTypeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'has_rule_config_with_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AllowArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	action: RawTransactionArgument<string>;
}
export interface AllowOptions {
	package: string;
	arguments:
		| AllowArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				action: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Allows an `action` to be performed on the `Token` freely by adding an empty set
 * of `Rules` for the `action`.
 *
 * Aborts if the `TokenPolicyCap` is not matching the `TokenPolicy`.
 */
export function allow(options: AllowOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'action'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'allow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DisallowArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	action: RawTransactionArgument<string>;
}
export interface DisallowOptions {
	package: string;
	arguments:
		| DisallowArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				action: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Completely disallows an `action` on the `Token` by removing the record from the
 * `TokenPolicy.rules`.
 *
 * Aborts if the `TokenPolicyCap` is not matching the `TokenPolicy`.
 */
export function disallow(options: DisallowOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'action'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'disallow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AddRuleForActionArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	action: RawTransactionArgument<string>;
}
export interface AddRuleForActionOptions {
	package: string;
	arguments:
		| AddRuleForActionArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				action: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Adds a Rule for an action with `name` in the `TokenPolicy`.
 *
 * Aborts if the `TokenPolicyCap` is not matching the `TokenPolicy`.
 */
export function addRuleForAction(options: AddRuleForActionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'action'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'add_rule_for_action',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveRuleForActionArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	action: RawTransactionArgument<string>;
}
export interface RemoveRuleForActionOptions {
	package: string;
	arguments:
		| RemoveRuleForActionArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				action: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Removes a rule for an action with `name` in the `TokenPolicy`. Returns the
 * config object to be handled by the sender (or a Rule itself).
 *
 * Aborts if the `TokenPolicyCap` is not matching the `TokenPolicy`.
 */
export function removeRuleForAction(options: RemoveRuleForActionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'action'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'remove_rule_for_action',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MintArguments {
	cap: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface MintOptions {
	package: string;
	arguments:
		| MintArguments
		| [cap: RawTransactionArgument<string>, amount: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/** Mint a `Token` with a given `amount` using the `TreasuryCap`. */
export function mint(options: MintOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['cap', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'mint',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BurnArguments {
	cap: RawTransactionArgument<string>;
	token: RawTransactionArgument<string>;
}
export interface BurnOptions {
	package: string;
	arguments:
		| BurnArguments
		| [cap: RawTransactionArgument<string>, token: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Burn a `Token` using the `TreasuryCap`. */
export function burn(options: BurnOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['cap', 'token'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'burn',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FlushArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface FlushOptions {
	package: string;
	arguments:
		| FlushArguments
		| [self: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Flush the `TokenPolicy.spent_balance` into the `TreasuryCap`. This action is
 * only available to the `TreasuryCap` owner.
 */
export function flush(options: FlushOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'flush',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsAllowedArguments {
	self: RawTransactionArgument<string>;
	action: RawTransactionArgument<string>;
}
export interface IsAllowedOptions {
	package: string;
	arguments:
		| IsAllowedArguments
		| [self: RawTransactionArgument<string>, action: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Check whether an action is present in the rules VecMap. */
export function isAllowed(options: IsAllowedOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['self', 'action'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'is_allowed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RulesArguments {
	self: RawTransactionArgument<string>;
	action: RawTransactionArgument<string>;
}
export interface RulesOptions {
	package: string;
	arguments:
		| RulesArguments
		| [self: RawTransactionArgument<string>, action: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Returns the rules required for a specific action. */
export function rules(options: RulesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['self', 'action'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'rules',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SpentBalanceArguments {
	self: RawTransactionArgument<string>;
}
export interface SpentBalanceOptions {
	package: string;
	arguments: SpentBalanceArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Returns the `spent_balance` of the `TokenPolicy`. */
export function spentBalance(options: SpentBalanceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'spent_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ValueArguments {
	t: RawTransactionArgument<string>;
}
export interface ValueOptions {
	package: string;
	arguments: ValueArguments | [t: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Returns the `balance` of the `Token`. */
export function value(options: ValueOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface TransferActionOptions {
	package: string;
	arguments?: [];
}
/** Name of the Transfer action. */
export function transferAction(options: TransferActionOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'transfer_action',
		});
}
export interface SpendActionOptions {
	package: string;
	arguments?: [];
}
/** Name of the `Spend` action. */
export function spendAction(options: SpendActionOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'spend_action',
		});
}
export interface ToCoinActionOptions {
	package: string;
	arguments?: [];
}
/** Name of the `ToCoin` action. */
export function toCoinAction(options: ToCoinActionOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'to_coin_action',
		});
}
export interface FromCoinActionOptions {
	package: string;
	arguments?: [];
}
/** Name of the `FromCoin` action. */
export function fromCoinAction(options: FromCoinActionOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'from_coin_action',
		});
}
export interface ActionArguments {
	self: RawTransactionArgument<string>;
}
export interface ActionOptions {
	package: string;
	arguments: ActionArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** The Action in the `ActionRequest`. */
export function action(options: ActionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'action',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AmountArguments {
	self: RawTransactionArgument<string>;
}
export interface AmountOptions {
	package: string;
	arguments: AmountArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Amount of the `ActionRequest`. */
export function amount(options: AmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SenderArguments {
	self: RawTransactionArgument<string>;
}
export interface SenderOptions {
	package: string;
	arguments: SenderArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Sender of the `ActionRequest`. */
export function sender(options: SenderOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'sender',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RecipientArguments {
	self: RawTransactionArgument<string>;
}
export interface RecipientOptions {
	package: string;
	arguments: RecipientArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Recipient of the `ActionRequest`. */
export function recipient(options: RecipientOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'recipient',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ApprovalsArguments {
	self: RawTransactionArgument<string>;
}
export interface ApprovalsOptions {
	package: string;
	arguments: ApprovalsArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Approvals of the `ActionRequest`. */
export function approvals(options: ApprovalsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'approvals',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SpentArguments {
	self: RawTransactionArgument<string>;
}
export interface SpentOptions {
	package: string;
	arguments: SpentArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Burned balance of the `ActionRequest`. */
export function spent(options: SpentOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'spent',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
