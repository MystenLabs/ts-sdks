/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as balance from './balance.js';
import * as vec_map from './vec_map.js';
import * as vec_set from './vec_set.js';
import * as type_name from './deps/0x0000000000000000000000000000000000000000000000000000000000000001/type_name.js';
const $moduleName = '0x2::token';
export const Token = new MoveStruct({
	name: `${$moduleName}::Token`,
	fields: {
		id: bcs.Address,
		balance: balance.Balance,
	},
});
export const TokenPolicyCap = new MoveStruct({
	name: `${$moduleName}::TokenPolicyCap`,
	fields: {
		id: bcs.Address,
		for: bcs.Address,
	},
});
export const TokenPolicy = new MoveStruct({
	name: `${$moduleName}::TokenPolicy`,
	fields: {
		id: bcs.Address,
		spent_balance: balance.Balance,
		rules: vec_map.VecMap(bcs.string(), vec_set.VecSet(type_name.TypeName)),
	},
});
export const ActionRequest = new MoveStruct({
	name: `${$moduleName}::ActionRequest`,
	fields: {
		name: bcs.string(),
		amount: bcs.u64(),
		sender: bcs.Address,
		recipient: bcs.option(bcs.Address),
		spent_balance: bcs.option(balance.Balance),
		approvals: vec_set.VecSet(type_name.TypeName),
	},
});
export const RuleKey = new MoveStruct({
	name: `${$moduleName}::RuleKey`,
	fields: {
		is_protected: bcs.bool(),
	},
});
export const TokenPolicyCreated = new MoveStruct({
	name: `${$moduleName}::TokenPolicyCreated`,
	fields: {
		id: bcs.Address,
		is_mutable: bcs.bool(),
	},
});
export interface NewPolicyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function newPolicy(options: NewPolicyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'new_policy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SharePolicyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function sharePolicy(options: SharePolicyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'share_policy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface TransferOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function transfer(options: TransferOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::Token<${options.typeArguments[0]}>`,
		'address',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SpendOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function spend(options: SpendOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::Token<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'spend',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ToCoinOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function toCoin(options: ToCoinOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::Token<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'to_coin',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface FromCoinOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function fromCoin(options: FromCoinOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::Coin<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'from_coin',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface JoinOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function join(options: JoinOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::Token<${options.typeArguments[0]}>`,
		`${packageAddress}::token::Token<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'join',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SplitOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
export function split(options: SplitOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::Token<${options.typeArguments[0]}>`,
		'u64',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'split',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ZeroOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
export function zero(options: ZeroOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'zero',
			typeArguments: options.typeArguments,
		});
}
export interface DestroyZeroOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function destroyZero(options: DestroyZeroOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::Token<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'destroy_zero',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface KeepOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function keep(options: KeepOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::Token<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'keep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface NewRequestOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
		RawTransactionArgument<string | null>,
		RawTransactionArgument<string | null>,
	];
	typeArguments: [string];
}
export function newRequest(options: NewRequestOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<address>',
		`0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<${packageAddress}::balance::Balance<${options.typeArguments[0]}>>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'new_request',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ConfirmRequestOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function confirmRequest(options: ConfirmRequestOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
		`${packageAddress}::token::ActionRequest<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'confirm_request',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ConfirmRequestMutOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function confirmRequestMut(options: ConfirmRequestMutOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
		`${packageAddress}::token::ActionRequest<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'confirm_request_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ConfirmWithPolicyCapOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function confirmWithPolicyCap(options: ConfirmWithPolicyCapOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicyCap<${options.typeArguments[0]}>`,
		`${packageAddress}::token::ActionRequest<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'confirm_with_policy_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ConfirmWithTreasuryCapOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function confirmWithTreasuryCap(options: ConfirmWithTreasuryCapOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
		`${packageAddress}::token::ActionRequest<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'confirm_with_treasury_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface AddApprovalOptions<T1 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T1>, RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function addApproval<T1 extends BcsType<any>>(options: AddApprovalOptions<T1>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${options.typeArguments[1]}`,
		`${packageAddress}::token::ActionRequest<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'add_approval',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface AddRuleConfigOptions<T1 extends BcsType<any>, T2 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<T1>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<T2>,
	];
	typeArguments: [string, string, string];
}
export function addRuleConfig<T1 extends BcsType<any>, T2 extends BcsType<any>>(
	options: AddRuleConfigOptions<T1, T2>,
) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${options.typeArguments[1]}`,
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
		`${packageAddress}::token::TokenPolicyCap<${options.typeArguments[0]}>`,
		`${options.typeArguments[2]}`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'add_rule_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RuleConfigOptions<T1 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T1>, RawTransactionArgument<string>];
	typeArguments: [string, string, string];
}
export function ruleConfig<T1 extends BcsType<any>>(options: RuleConfigOptions<T1>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${options.typeArguments[1]}`,
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'rule_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RuleConfigMutOptions<T1 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<T1>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string, string, string];
}
export function ruleConfigMut<T1 extends BcsType<any>>(options: RuleConfigMutOptions<T1>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${options.typeArguments[1]}`,
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
		`${packageAddress}::token::TokenPolicyCap<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'rule_config_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveRuleConfigOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string, string, string];
}
export function removeRuleConfig(options: RemoveRuleConfigOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
		`${packageAddress}::token::TokenPolicyCap<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'remove_rule_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface HasRuleConfigOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function hasRuleConfig(options: HasRuleConfigOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'has_rule_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface HasRuleConfigWithTypeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string, string];
}
export function hasRuleConfigWithType(options: HasRuleConfigWithTypeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'has_rule_config_with_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface AllowOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function allow(options: AllowOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
		`${packageAddress}::token::TokenPolicyCap<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'allow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DisallowOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function disallow(options: DisallowOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
		`${packageAddress}::token::TokenPolicyCap<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'disallow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface AddRuleForActionOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string, string];
}
export function addRuleForAction(options: AddRuleForActionOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
		`${packageAddress}::token::TokenPolicyCap<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'add_rule_for_action',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveRuleForActionOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string, string];
}
export function removeRuleForAction(options: RemoveRuleForActionOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
		`${packageAddress}::token::TokenPolicyCap<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'remove_rule_for_action',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MintOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
export function mint(options: MintOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
		'u64',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'mint',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BurnOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function burn(options: BurnOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
		`${packageAddress}::token::Token<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'burn',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface FlushOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function flush(options: FlushOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'flush',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IsAllowedOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function isAllowed(options: IsAllowedOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'is_allowed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RulesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function rules(options: RulesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'rules',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SpentBalanceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function spentBalance(options: SpentBalanceOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::TokenPolicy<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'spent_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ValueOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function value(options: ValueOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::Token<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface TransferActionOptions {
	package?: string;
	arguments?: [];
}
export function transferAction(options: TransferActionOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'transfer_action',
		});
}
export interface SpendActionOptions {
	package?: string;
	arguments?: [];
}
export function spendAction(options: SpendActionOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'spend_action',
		});
}
export interface ToCoinActionOptions {
	package?: string;
	arguments?: [];
}
export function toCoinAction(options: ToCoinActionOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'to_coin_action',
		});
}
export interface FromCoinActionOptions {
	package?: string;
	arguments?: [];
}
export function fromCoinAction(options: FromCoinActionOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'from_coin_action',
		});
}
export interface ActionOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function action(options: ActionOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::ActionRequest<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'action',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface AmountOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function amount(options: AmountOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::ActionRequest<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SenderOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function sender(options: SenderOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::ActionRequest<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'sender',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RecipientOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function recipient(options: RecipientOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::ActionRequest<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'recipient',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ApprovalsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function approvals(options: ApprovalsOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::ActionRequest<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'approvals',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SpentOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function spent(options: SpentOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::token::ActionRequest<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'token',
			function: 'spent',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
