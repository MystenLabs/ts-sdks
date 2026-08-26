/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Owns time-limited trading session grants attached to canonical Accounts. Account
 * owners grant and revoke sessions; an active session can only generate app auth
 * inside the Predict and DeepBook spot wrappers exposed here.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@local-pkg/deepbook_sessions::sessions';
export const SessionsApp = new MoveStruct({
	name: `${$moduleName}::SessionsApp`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const SessionsData = new MoveStruct({
	name: `${$moduleName}::SessionsData`,
	fields: {
		sessions: vec_map.VecMap(bcs.Address, U64),
	},
});
export const SessionAuthorized = new MoveStruct({
	name: `${$moduleName}::SessionAuthorized`,
	fields: {
		account_id: bcs.Address,
		session: bcs.Address,
		expires_at_ms: U64,
	},
});
export const SessionRevoked = new MoveStruct({
	name: `${$moduleName}::SessionRevoked`,
	fields: {
		account_id: bcs.Address,
		session: bcs.Address,
		expires_at_ms: U64,
	},
});
export interface SessionExpirationMsArguments {
	wrapper: RawTransactionArgument<string>;
	session: RawTransactionArgument<string>;
}
export interface SessionExpirationMsOptions {
	package?: string;
	arguments:
		| SessionExpirationMsArguments
		| [wrapper: RawTransactionArgument<string>, session: RawTransactionArgument<string>];
	config?: {
		sessionsPackageId?: string;
	};
}
/** Return a known session's expiration timestamp for SDK and devInspect reads. */
export function sessionExpirationMs(options: SessionExpirationMsOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['wrapper', 'session'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'session_expiration_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AuthorizeSessionArguments {
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	session: RawTransactionArgument<string>;
	durationMs: RawTransactionArgument<number | bigint>;
}
export interface AuthorizeSessionOptions {
	package?: string;
	arguments: AuthorizeSessionArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * Authorize `session` from execution time for at most 30 days. Accounts may store
 * at most 20 addresses; reauthorization replaces in place.
 */
export function authorizeSession(options: AuthorizeSessionOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null, null, 'address', 'u64', '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['wrapper', 'sessionsConfig', 'session', 'durationMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'authorize_session',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					sessionsConfig: options.arguments?.sessionsConfig ?? options.config?.sessionsConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RevokeSessionArguments {
	wrapper: RawTransactionArgument<string>;
	session: RawTransactionArgument<string>;
}
export interface RevokeSessionOptions {
	package?: string;
	arguments:
		| RevokeSessionArguments
		| [wrapper: RawTransactionArgument<string>, session: RawTransactionArgument<string>];
	config?: {
		sessionsPackageId?: string;
	};
}
/**
 * Revoke `session` if it is present. Only the Account owner may call this
 * function.
 */
export function revokeSession(options: RevokeSessionOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['wrapper', 'session'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'revoke_session',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PlaceLimitOrderArguments {
	pool: RawTransactionArgument<string>;
	deepbookRegistry: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	clientOrderId: RawTransactionArgument<number | bigint>;
	orderType: RawTransactionArgument<number>;
	selfMatchingOption: RawTransactionArgument<number>;
	price: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
	expireTimestamp: RawTransactionArgument<number | bigint>;
}
export interface PlaceLimitOrderOptions {
	package?: string;
	arguments: PlaceLimitOrderArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
	typeArguments: [string, string];
}
/** Place a DeepBook spot limit order for an Account with an active session. */
export function placeLimitOrder(options: PlaceLimitOrderOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u8',
		'u8',
		'u64',
		'u64',
		'bool',
		'bool',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'pool',
		'deepbookRegistry',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'clientOrderId',
		'orderType',
		'selfMatchingOption',
		'price',
		'quantity',
		'isBid',
		'payWithDeep',
		'expireTimestamp',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'place_limit_order',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					sessionsConfig: options.arguments?.sessionsConfig ?? options.config?.sessionsConfig,
				},
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceMarketOrderArguments {
	pool: RawTransactionArgument<string>;
	deepbookRegistry: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	clientOrderId: RawTransactionArgument<number | bigint>;
	selfMatchingOption: RawTransactionArgument<number>;
	quantity: RawTransactionArgument<number | bigint>;
	priceLimit: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
}
export interface PlaceMarketOrderOptions {
	package?: string;
	arguments: PlaceMarketOrderArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
	typeArguments: [string, string];
}
/** Place a DeepBook spot market order for an Account with an active session. */
export function placeMarketOrder(options: PlaceMarketOrderOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u8',
		'u64',
		'u64',
		'bool',
		'bool',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'pool',
		'deepbookRegistry',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'clientOrderId',
		'selfMatchingOption',
		'quantity',
		'priceLimit',
		'isBid',
		'payWithDeep',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'place_market_order',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					sessionsConfig: options.arguments?.sessionsConfig ?? options.config?.sessionsConfig,
				},
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface CancelLiveOrderArguments {
	pool: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
}
export interface CancelLiveOrderOptions {
	package?: string;
	arguments: CancelLiveOrderArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
	typeArguments: [string, string];
}
/** Cancel a DeepBook spot order for an Account with an active session. */
export function cancelLiveOrder(options: CancelLiveOrderOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null, null, null, null, 'u128', '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['pool', 'accountRegistry', 'wrapper', 'sessionsConfig', 'orderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'cancel_live_order',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					sessionsConfig: options.arguments?.sessionsConfig ?? options.config?.sessionsConfig,
				},
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface CancelLiveOrdersArguments {
	pool: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	orderIds: RawTransactionArgument<Array<number | bigint>>;
}
export interface CancelLiveOrdersOptions {
	package?: string;
	arguments: CancelLiveOrdersArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
	typeArguments: [string, string];
}
/** Cancel multiple DeepBook spot orders for an Account with an active session. */
export function cancelLiveOrders(options: CancelLiveOrdersOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null, null, null, null, 'vector<u128>', '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['pool', 'accountRegistry', 'wrapper', 'sessionsConfig', 'orderIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'cancel_live_orders',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					sessionsConfig: options.arguments?.sessionsConfig ?? options.config?.sessionsConfig,
				},
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawSettledAmountsArguments {
	pool: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
}
export interface WithdrawSettledAmountsOptions {
	package?: string;
	arguments: WithdrawSettledAmountsArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
	typeArguments: [string, string];
}
/** Sweep settled DeepBook spot proceeds into an Account with an active session. */
export function withdrawSettledAmounts(options: WithdrawSettledAmountsOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null, null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['pool', 'accountRegistry', 'wrapper', 'sessionsConfig'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'withdraw_settled_amounts',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					sessionsConfig: options.arguments?.sessionsConfig ?? options.config?.sessionsConfig,
				},
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface MintExactQuantityArguments {
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	maxProbability: RawTransactionArgument<number | bigint>;
}
export interface MintExactQuantityOptions {
	package?: string;
	arguments: MintExactQuantityArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/** Mint an exact Predict position quantity for an Account with an active session. */
export function mintExactQuantity(options: MintExactQuantityOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'config',
		'pricer',
		'lowerTick',
		'higherTick',
		'quantity',
		'maxCost',
		'maxProbability',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'mint_exact_quantity',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					sessionsConfig: options.arguments?.sessionsConfig ?? options.config?.sessionsConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface MintExactAmountArguments {
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxPremium: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
}
export interface MintExactAmountOptions {
	package?: string;
	arguments: MintExactAmountArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/** Mint a budget-sized Predict position for an Account with an active session. */
export function mintExactAmount(options: MintExactAmountOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'config',
		'pricer',
		'lowerTick',
		'higherTick',
		'maxPremium',
		'minQuantity',
		'maxCost',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'mint_exact_amount',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					sessionsConfig: options.arguments?.sessionsConfig ?? options.config?.sessionsConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RedeemLiveArguments {
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	orderId: RawTransactionArgument<number | bigint>;
	closeQuantity: RawTransactionArgument<number | bigint>;
	minProbability: RawTransactionArgument<number | bigint>;
	minProceeds: RawTransactionArgument<number | bigint>;
}
export interface RedeemLiveOptions {
	package?: string;
	arguments: RedeemLiveArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/** Redeem a live Predict order for an Account with an active session. */
export function redeemLive(options: RedeemLiveOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		'u256',
		'u64',
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'config',
		'pricer',
		'orderId',
		'closeQuantity',
		'minProbability',
		'minProceeds',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'redeem_live',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					sessionsConfig: options.arguments?.sessionsConfig ?? options.config?.sessionsConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RedeemSettledArguments {
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
}
export interface RedeemSettledOptions {
	package?: string;
	arguments: RedeemSettledArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/** Redeem a settled Predict order for an Account with an active session. */
export function redeemSettled(options: RedeemSettledOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		'u256',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'config',
		'orderId',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'redeem_settled',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					sessionsConfig: options.arguments?.sessionsConfig ?? options.config?.sessionsConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
