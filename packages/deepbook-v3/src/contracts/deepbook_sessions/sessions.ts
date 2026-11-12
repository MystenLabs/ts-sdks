/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Owns time-limited trading session grants attached to canonical Accounts. Account
 * owners grant and revoke sessions; an active session can only generate app auth
 * inside the Predict and DeepBook spot wrappers exposed here.
 *
 * Session-key spot orders trade only on the pools in `SessionsConfig`'s allowlist,
 * which the `SessionsAdminCap` holder maintains.
 *
 * A session-key trade that names a Predict builder code pays that builder a fee
 * the session holder picks, so the owner approves one code and a maximum fee per
 * session (`approve_session_builder`), and the `_with_builder` wrappers accept
 * only that code at or below that fee.
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
export const SessionBuildersApp = new MoveStruct({
	name: `${$moduleName}::SessionBuildersApp`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const SessionBuilder = new MoveStruct({
	name: `${$moduleName}::SessionBuilder`,
	fields: {
		code_id: bcs.Address,
		max_fee_per_contract: U64,
	},
});
export const SessionBuilders = new MoveStruct({
	name: `${$moduleName}::SessionBuilders`,
	fields: {
		approvals: vec_map.VecMap(bcs.Address, SessionBuilder),
	},
});
export const SessionBuilderApproved = new MoveStruct({
	name: `${$moduleName}::SessionBuilderApproved`,
	fields: {
		account_id: bcs.Address,
		session: bcs.Address,
		code_id: bcs.Address,
		max_fee_per_contract: U64,
	},
});
export const SessionBuilderCleared = new MoveStruct({
	name: `${$moduleName}::SessionBuilderCleared`,
	fields: {
		account_id: bcs.Address,
		session: bcs.Address,
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
export interface SessionBuilderArguments {
	wrapper: RawTransactionArgument<string>;
	session: RawTransactionArgument<string>;
}
export interface SessionBuilderOptions {
	package?: string;
	arguments:
		| SessionBuilderArguments
		| [wrapper: RawTransactionArgument<string>, session: RawTransactionArgument<string>];
	config?: {
		sessionsPackageId?: string;
	};
}
/** Return a session's approved builder, or `none`, for SDK and devInspect reads. */
export function sessionBuilder(options: SessionBuilderOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['wrapper', 'session'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'session_builder',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ApprovedCodeIdArguments {
	builder: TransactionArgument;
}
export interface ApprovedCodeIdOptions {
	package?: string;
	arguments: ApprovedCodeIdArguments | [builder: TransactionArgument];
	config?: {
		sessionsPackageId?: string;
	};
}
/** Return the builder code an approval allows, for SDK and devInspect reads. */
export function approvedCodeId(options: ApprovedCodeIdOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['builder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'approved_code_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ApprovedMaxFeePerContractArguments {
	builder: TransactionArgument;
}
export interface ApprovedMaxFeePerContractOptions {
	package?: string;
	arguments: ApprovedMaxFeePerContractArguments | [builder: TransactionArgument];
	config?: {
		sessionsPackageId?: string;
	};
}
/** Return the most an approval allows per contract, for SDK and devInspect reads. */
export function approvedMaxFeePerContract(options: ApprovedMaxFeePerContractOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['builder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'approved_max_fee_per_contract',
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
 * at most 20 addresses; reauthorization replaces in place and keeps the session's
 * builder approval, while a new grant starts without one. A session that expired
 * but was never revoked is still stored, so granting it again is a reauthorization
 * and keeps its approval.
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
export interface ApproveSessionBuilderArguments {
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	session: RawTransactionArgument<string>;
	codeId: RawTransactionArgument<string>;
	maxFeePerContract: RawTransactionArgument<number | bigint>;
}
export interface ApproveSessionBuilderOptions {
	package?: string;
	arguments: ApproveSessionBuilderArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * Approve the builder code `session`'s trades may name, and the most they may
 * charge per contract (`max_fee_per_contract`, in FLOAT_SCALING of the $1 payout),
 * replacing any earlier approval. Only the Account owner may call this, and only
 * for a session already authorized (`ESessionNotAuthorized`), so an app calls it
 * right after `authorize_session` in the same transaction. The approval lasts
 * until `revoke_session`; re-authorizing the session keeps it. Aborts
 * `EBuilderApprovalsNotEnabled` until the `SessionsConfig` watermark reaches the
 * first version that clears stale approvals.
 */
export function approveSessionBuilder(options: ApproveSessionBuilderOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null, null, 'address', '0x2::object::ID', 'u64'] satisfies (
		string | null
	)[];
	const parameterNames = ['wrapper', 'sessionsConfig', 'session', 'codeId', 'maxFeePerContract'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'approve_session_builder',
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
 * Revoke `session` and its builder approval if present. Only the Account owner may
 * call this function.
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
/**
 * Place a DeepBook spot limit order for an Account with an active session, on a
 * pool in the `SessionsConfig` allowlist (`session_config::EPoolNotAllowed`).
 */
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
/**
 * Place a DeepBook spot market order for an Account with an active session, on a
 * pool in the `SessionsConfig` allowlist (`session_config::EPoolNotAllowed`).
 */
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
/**
 * Cancel a DeepBook spot order for an Account with an active session, on any pool,
 * so orders on a pool removed from the allowlist can still be cancelled.
 */
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
/**
 * Mint an exact Predict position quantity for an Account with an active session.
 * Always aborts through Predict, whose immediate mints are retired; use
 * `enqueue_exact_quantity`.
 */
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
/**
 * Mint a budget-sized Predict position for an Account with an active session.
 * Always aborts through Predict, whose immediate mints are retired; use
 * `enqueue_exact_amount`.
 */
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
export interface MintExactCostArguments {
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
}
export interface MintExactCostOptions {
	package?: string;
	arguments: MintExactCostArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * Mint a Predict position sized to an all-in cost for an Account with an active
 * session. Always aborts through Predict, whose immediate mints are retired; use
 * `enqueue_exact_cost`.
 */
export function mintExactCost(options: MintExactCostOptions) {
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
		'maxCost',
		'minQuantity',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'mint_exact_cost',
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
/**
 * Redeem a live Predict order for an Account with an active session. Always aborts
 * through Predict, whose live redeem is retired. Early sells of queued positions
 * go through `enqueue_redeem_open`.
 */
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
export interface EnqueueExactQuantityArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	desk: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	maxProbability: RawTransactionArgument<number | bigint>;
}
export interface EnqueueExactQuantityOptions {
	package?: string;
	arguments: EnqueueExactQuantityArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * Queue an exact-quantity Predict mint in `market`'s order-flow queue for an
 * Account with an active session. Returns the queue record ID.
 */
export function enqueueExactQuantity(options: EnqueueExactQuantityOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
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
		'queue',
		'market',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'desk',
		'config',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
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
			function: 'enqueue_exact_quantity',
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
export interface EnqueueExactQuantityWithBuilderArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	desk: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	code: RawTransactionArgument<string>;
	builderFeePerContract: RawTransactionArgument<number | bigint>;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	maxProbability: RawTransactionArgument<number | bigint>;
}
export interface EnqueueExactQuantityWithBuilderOptions {
	package?: string;
	arguments: EnqueueExactQuantityWithBuilderArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * `enqueue_exact_quantity` for a session-key mint that names a builder: `code` and
 * `builder_fee_per_contract` must be the session's approved code and at most its
 * approved fee (`EBuilderNotApproved`, `EBuilderFeeAboveApproved`), after the
 * session checks. Returns the new queue record ID.
 */
export function enqueueExactQuantityWithBuilder(options: EnqueueExactQuantityWithBuilderOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
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
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'queue',
		'market',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'desk',
		'config',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
		'code',
		'builderFeePerContract',
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
			function: 'enqueue_exact_quantity_with_builder',
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
export interface EnqueueExactAmountArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	desk: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxPremium: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
}
export interface EnqueueExactAmountOptions {
	package?: string;
	arguments: EnqueueExactAmountArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * Queue a premium-budget Predict mint in `market`'s order-flow queue for an
 * Account with an active session. Returns the queue record ID.
 */
export function enqueueExactAmount(options: EnqueueExactAmountOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
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
		'queue',
		'market',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'desk',
		'config',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
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
			function: 'enqueue_exact_amount',
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
export interface EnqueueExactAmountWithBuilderArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	desk: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	code: RawTransactionArgument<string>;
	builderFeePerContract: RawTransactionArgument<number | bigint>;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxPremium: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
}
export interface EnqueueExactAmountWithBuilderOptions {
	package?: string;
	arguments: EnqueueExactAmountWithBuilderArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * `enqueue_exact_amount` for a session-key mint that names a builder: `code` and
 * `builder_fee_per_contract` must be the session's approved code and at most its
 * approved fee (`EBuilderNotApproved`, `EBuilderFeeAboveApproved`), after the
 * session checks. Returns the new queue record ID.
 */
export function enqueueExactAmountWithBuilder(options: EnqueueExactAmountWithBuilderOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
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
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'queue',
		'market',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'desk',
		'config',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
		'code',
		'builderFeePerContract',
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
			function: 'enqueue_exact_amount_with_builder',
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
export interface EnqueueExactCostArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	desk: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
}
export interface EnqueueExactCostOptions {
	package?: string;
	arguments: EnqueueExactCostArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * Queue an all-in-budget Predict mint in `market`'s order-flow queue for an
 * Account with an active session. Returns the queue record ID.
 */
export function enqueueExactCost(options: EnqueueExactCostOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
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
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'queue',
		'market',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'desk',
		'config',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
		'lowerTick',
		'higherTick',
		'maxCost',
		'minQuantity',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'enqueue_exact_cost',
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
export interface EnqueueExactCostWithBuilderArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	desk: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	code: RawTransactionArgument<string>;
	builderFeePerContract: RawTransactionArgument<number | bigint>;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
}
export interface EnqueueExactCostWithBuilderOptions {
	package?: string;
	arguments: EnqueueExactCostWithBuilderArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * `enqueue_exact_cost` for a session-key mint that names a builder: `code` and
 * `builder_fee_per_contract` must be the session's approved code and at most its
 * approved fee (`EBuilderNotApproved`, `EBuilderFeeAboveApproved`), after the
 * session checks. Returns the new queue record ID.
 */
export function enqueueExactCostWithBuilder(options: EnqueueExactCostWithBuilderOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
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
		'queue',
		'market',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'desk',
		'config',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
		'code',
		'builderFeePerContract',
		'lowerTick',
		'higherTick',
		'maxCost',
		'minQuantity',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'enqueue_exact_cost_with_builder',
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
export interface EnqueueRedeemOpenArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	desk: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	recordId: RawTransactionArgument<number | bigint>;
	closeQuantity: RawTransactionArgument<number | bigint>;
	minProbability: RawTransactionArgument<number | bigint>;
	minProceeds: RawTransactionArgument<number | bigint>;
}
export interface EnqueueRedeemOpenOptions {
	package?: string;
	arguments: EnqueueRedeemOpenArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * Queue an early sell of an Open order-flow queue record for an Account with an
 * active session. Returns the new queue record ID.
 */
export function enqueueRedeemOpen(options: EnqueueRedeemOpenOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
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
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'queue',
		'market',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'desk',
		'config',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
		'recordId',
		'closeQuantity',
		'minProbability',
		'minProceeds',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'enqueue_redeem_open',
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
export interface EnqueueRedeemOpenWithBuilderArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	sessionsConfig?: RawTransactionArgument<string>;
	desk: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	code: RawTransactionArgument<string>;
	builderFeePerContract: RawTransactionArgument<number | bigint>;
	recordId: RawTransactionArgument<number | bigint>;
	closeQuantity: RawTransactionArgument<number | bigint>;
	minProbability: RawTransactionArgument<number | bigint>;
	minProceeds: RawTransactionArgument<number | bigint>;
}
export interface EnqueueRedeemOpenWithBuilderOptions {
	package?: string;
	arguments: EnqueueRedeemOpenWithBuilderArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * `enqueue_redeem_open` for a session-key sell that names a builder: `code` and
 * `builder_fee_per_contract` must be the session's approved code and at most its
 * approved fee (`EBuilderNotApproved`, `EBuilderFeeAboveApproved`), after the
 * session checks. Returns the new queue record ID.
 */
export function enqueueRedeemOpenWithBuilder(options: EnqueueRedeemOpenWithBuilderOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
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
		'queue',
		'market',
		'accountRegistry',
		'wrapper',
		'sessionsConfig',
		'desk',
		'config',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
		'code',
		'builderFeePerContract',
		'recordId',
		'closeQuantity',
		'minProbability',
		'minProceeds',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sessions',
			function: 'enqueue_redeem_open_with_builder',
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
