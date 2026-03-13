/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@mysten/pas::unlock_funds';
/**
 * An unlock funds request that is generated once a Permissioned Funds Transfer is
 * initiated.
 *
 * This can be resolved in two ways:
 *
 * 1.  If the asset is `permissioned` (there's a `Policy<T>` for that asset), it
 *     can only be resolved by the creator by calling
 *     `policy::resolve_unlock_funds`
 * 2.  If the asset is not permissioned, it can be resolved by any address by
 *     calling `unlock_funds::resolve_unrestricted_balance`
 */
export function UnlockFunds<T extends BcsType<any>>(...typeParameters: [T]) {
	return new MoveStruct({
		name: `${$moduleName}::UnlockFunds<${typeParameters[0].name as T['name']}>`,
		fields: {
			/** `owner` is the wallet OR object address, NOT the account address */
			owner: bcs.Address,
			/** The ID of the account the funds are coming from */
			account_id: bcs.Address,
			/** The actual balance being transferred */
			funds: typeParameters[0],
		},
	});
}
export interface OwnerArguments {
	request: RawTransactionArgument<string>;
}
export interface OwnerOptions {
	package?: string;
	arguments: OwnerArguments | [request: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function owner(options: OwnerOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'unlock_funds',
			function: 'owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AccountIdArguments {
	request: RawTransactionArgument<string>;
}
export interface AccountIdOptions {
	package?: string;
	arguments: AccountIdArguments | [request: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function accountId(options: AccountIdOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'unlock_funds',
			function: 'account_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FundsArguments {
	request: RawTransactionArgument<string>;
}
export interface FundsOptions {
	package?: string;
	arguments: FundsArguments | [request: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function funds(options: FundsOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'unlock_funds',
			function: 'funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ResolveUnrestrictedBalanceArguments {
	request: RawTransactionArgument<string>;
	namespace: RawTransactionArgument<string>;
}
export interface ResolveUnrestrictedBalanceOptions {
	package?: string;
	arguments:
		| ResolveUnrestrictedBalanceArguments
		| [request: RawTransactionArgument<string>, namespace: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * This enables unlocking assets that are not managed by a Policy within the
 * system. If a `Policy<T>` exists, they can only be resolved from within the
 * system.
 *
 * For example, `SUI` will never be a managed asset, so the owner needs to be able
 * to withdraw if anyone transfers some to their account.
 */
export function resolveUnrestrictedBalance(options: ResolveUnrestrictedBalanceOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['request', 'namespace'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'unlock_funds',
			function: 'resolve_unrestricted_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ResolveArguments {
	request: RawTransactionArgument<string>;
	policy: RawTransactionArgument<string>;
}
export interface ResolveOptions {
	package?: string;
	arguments:
		| ResolveArguments
		| [request: RawTransactionArgument<string>, policy: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Resolve an unlock funds request as long as funds management is enabled and there
 * are enough valid approvals.
 */
export function resolve(options: ResolveOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['request', 'policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'unlock_funds',
			function: 'resolve',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
