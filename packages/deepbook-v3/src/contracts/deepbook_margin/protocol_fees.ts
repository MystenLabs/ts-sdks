/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as table from './deps/sui/table.js';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@deepbook/margin::protocol_fees';
export const ProtocolFees = new MoveStruct({
	name: `${$moduleName}::ProtocolFees`,
	fields: {
		referrals: table.Table,
		total_shares: bcs.u64(),
		fees_per_share: bcs.u64(),
		maintainer_fees: bcs.u64(),
		protocol_fees: bcs.u64(),
		extra_fields: vec_map.VecMap(bcs.string(), bcs.u64()),
	},
});
export const ReferralTracker = new MoveStruct({
	name: `${$moduleName}::ReferralTracker`,
	fields: {
		current_shares: bcs.u64(),
		last_fees_per_share: bcs.u64(),
		unclaimed_fees: bcs.u64(),
	},
});
export const SupplyReferral = new MoveStruct({
	name: `${$moduleName}::SupplyReferral`,
	fields: {
		id: bcs.Address,
		owner: bcs.Address,
	},
});
export const ProtocolFeesIncreasedEvent = new MoveStruct({
	name: `${$moduleName}::ProtocolFeesIncreasedEvent`,
	fields: {
		margin_pool_id: bcs.Address,
		total_shares: bcs.u64(),
		referral_fees: bcs.u64(),
		maintainer_fees: bcs.u64(),
		protocol_fees: bcs.u64(),
	},
});
export const ReferralFeesClaimedEvent = new MoveStruct({
	name: `${$moduleName}::ReferralFeesClaimedEvent`,
	fields: {
		referral_id: bcs.Address,
		owner: bcs.Address,
		fees: bcs.u64(),
	},
});
export interface MaintainerFeesArguments {
	self: TransactionArgument;
}
export interface MaintainerFeesOptions {
	package?: string;
	arguments: MaintainerFeesArguments | [self: TransactionArgument];
}
/** Get the maintainer fees. */
export function maintainerFees(options: MaintainerFeesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_fees',
			function: 'maintainer_fees',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ProtocolFeesArguments {
	self: TransactionArgument;
}
export interface ProtocolFeesOptions {
	package?: string;
	arguments: ProtocolFeesArguments | [self: TransactionArgument];
}
/** Get the protocol fees. */
export function protocolFees(options: ProtocolFeesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_fees',
			function: 'protocol_fees',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReferralTrackerArguments {
	self: TransactionArgument;
	referral: RawTransactionArgument<string>;
}
export interface ReferralTrackerOptions {
	package?: string;
	arguments:
		| ReferralTrackerArguments
		| [self: TransactionArgument, referral: RawTransactionArgument<string>];
}
export function referralTracker(options: ReferralTrackerOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'referral'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_fees',
			function: 'referral_tracker',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TotalSharesArguments {
	self: TransactionArgument;
}
export interface TotalSharesOptions {
	package?: string;
	arguments: TotalSharesArguments | [self: TransactionArgument];
}
export function totalShares(options: TotalSharesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_fees',
			function: 'total_shares',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FeesPerShareArguments {
	self: TransactionArgument;
}
export interface FeesPerShareOptions {
	package?: string;
	arguments: FeesPerShareArguments | [self: TransactionArgument];
}
export function feesPerShare(options: FeesPerShareOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_fees',
			function: 'fees_per_share',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
