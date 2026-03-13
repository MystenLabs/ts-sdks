/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	MoveTuple,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_map from './deps/sui/vec_map.js';
import * as vec_set from './deps/sui/vec_set.js';
import * as type_name from './deps/std/type_name.js';
import * as versioning from './versioning.js';
const $moduleName = '@mysten/pas::policy';
export const Policy = new MoveStruct({
	name: `${$moduleName}::Policy<phantom T>`,
	fields: {
		id: bcs.Address,
		/**
		 * The required approvals per request type. The key must be one of the request
		 * types (e.g. `send_funds`, `unlock_funds` or `clawback_funds`).
		 *
		 * The value is a vector of approvals that need to be gather to resolve the
		 * request.
		 */
		required_approvals: vec_map.VecMap(bcs.string(), vec_set.VecSet(type_name.TypeName)),
		/**
		 * Block versions to break backwards compatibility -- only used in case of
		 * emergency.
		 */
		versioning: versioning.Versioning,
		/** Whether clawback is allowed for this policy. */
		clawback_allowed: bcs.bool(),
	},
});
export const PolicyCap = new MoveStruct({
	name: `${$moduleName}::PolicyCap<phantom T>`,
	fields: {
		id: bcs.Address,
	},
});
export const PolicyCapKey = new MoveTuple({
	name: `${$moduleName}::PolicyCapKey`,
	fields: [bcs.bool()],
});
export interface NewForCurrencyArguments {
	namespace: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
	clawbackAllowed: RawTransactionArgument<boolean>;
}
export interface NewForCurrencyOptions {
	package?: string;
	arguments:
		| NewForCurrencyArguments
		| [
				namespace: RawTransactionArgument<string>,
				Cap: RawTransactionArgument<string>,
				clawbackAllowed: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string];
}
export function newForCurrency(options: NewForCurrencyOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null, 'bool'] satisfies (string | null)[];
	const parameterNames = ['namespace', 'Cap', 'clawbackAllowed'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'policy',
			function: 'new_for_currency',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ShareArguments {
	policy: RawTransactionArgument<string>;
}
export interface ShareOptions {
	package?: string;
	arguments: ShareArguments | [policy: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function share(options: ShareOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'policy',
			function: 'share',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RequiredApprovalsArguments {
	policy: RawTransactionArgument<string>;
	actionType: RawTransactionArgument<string>;
}
export interface RequiredApprovalsOptions {
	package?: string;
	arguments:
		| RequiredApprovalsArguments
		| [policy: RawTransactionArgument<string>, actionType: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the set of required approvals for a given action. */
export function requiredApprovals(options: RequiredApprovalsOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['policy', 'actionType'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'policy',
			function: 'required_approvals',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SetRequiredApprovalArguments {
	policy: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	action: RawTransactionArgument<string>;
}
export interface SetRequiredApprovalOptions {
	package?: string;
	arguments:
		| SetRequiredApprovalArguments
		| [
				policy: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				action: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
export function setRequiredApproval(options: SetRequiredApprovalOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['policy', 'cap', 'action'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'policy',
			function: 'set_required_approval',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveActionApprovalArguments {
	policy: RawTransactionArgument<string>;
	_: RawTransactionArgument<string>;
	action: RawTransactionArgument<string>;
}
export interface RemoveActionApprovalOptions {
	package?: string;
	arguments:
		| RemoveActionApprovalArguments
		| [
				policy: RawTransactionArgument<string>,
				_: RawTransactionArgument<string>,
				action: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Remove the action approval for a given action (this will make all requests not
 * resolve).
 */
export function removeActionApproval(options: RemoveActionApprovalOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['policy', '_', 'action'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'policy',
			function: 'remove_action_approval',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SyncVersioningArguments {
	policy: RawTransactionArgument<string>;
	namespace: RawTransactionArgument<string>;
}
export interface SyncVersioningOptions {
	package?: string;
	arguments:
		| SyncVersioningArguments
		| [policy: RawTransactionArgument<string>, namespace: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Allows syncing the versioning of a policy to the namespace's versioning. This is
 * permission-less and can be done by anyone.
 */
export function syncVersioning(options: SyncVersioningOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['policy', 'namespace'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'policy',
			function: 'sync_versioning',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
