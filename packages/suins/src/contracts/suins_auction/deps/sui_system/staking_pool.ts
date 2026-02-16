/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as balance from '../sui/balance.js';
import * as table from '../sui/table.js';
import * as bag from '../sui/bag.js';
const $moduleName = '0x3::staking_pool';
export const StakingPool = new MoveStruct({
	name: `${$moduleName}::StakingPool`,
	fields: {
		id: bcs.Address,
		/**
		 * The epoch at which this pool became active. The value is `None` if the pool is
		 * pre-active and `Some(<epoch_number>)` if active or inactive.
		 */
		activation_epoch: bcs.option(bcs.u64()),
		/**
		 * The epoch at which this staking pool ceased to be active. `None` = {pre-active,
		 * active}, `Some(<epoch_number>)` if in-active, and it was de-activated at epoch
		 * `<epoch_number>`.
		 */
		deactivation_epoch: bcs.option(bcs.u64()),
		/**
		 * The total number of SUI tokens in this pool, including the SUI in the
		 * rewards_pool, as well as in all the principal in the `StakedSui` object, updated
		 * at epoch boundaries.
		 */
		sui_balance: bcs.u64(),
		/** The epoch stake rewards will be added here at the end of each epoch. */
		rewards_pool: balance.Balance,
		/** Total number of pool tokens issued by the pool. */
		pool_token_balance: bcs.u64(),
		/**
		 * Exchange rate history of previous epochs. Key is the epoch number. The entries
		 * start from the `activation_epoch` of this pool and contains exchange rates at
		 * the beginning of each epoch, i.e., right after the rewards for the previous
		 * epoch have been deposited into the pool.
		 */
		exchange_rates: table.Table,
		/** Pending stake amount for this epoch, emptied at epoch boundaries. */
		pending_stake: bcs.u64(),
		/**
		 * Pending stake withdrawn during the current epoch, emptied at epoch boundaries.
		 * This includes both the principal and rewards SUI withdrawn.
		 */
		pending_total_sui_withdraw: bcs.u64(),
		/**
		 * Pending pool token withdrawn during the current epoch, emptied at epoch
		 * boundaries.
		 */
		pending_pool_token_withdraw: bcs.u64(),
		/** Any extra fields that's not defined statically. */
		extra_fields: bag.Bag,
	},
});
export const PoolTokenExchangeRate = new MoveStruct({
	name: `${$moduleName}::PoolTokenExchangeRate`,
	fields: {
		sui_amount: bcs.u64(),
		pool_token_amount: bcs.u64(),
	},
});
export const StakedSui = new MoveStruct({
	name: `${$moduleName}::StakedSui`,
	fields: {
		id: bcs.Address,
		/** ID of the staking pool we are staking with. */
		pool_id: bcs.Address,
		/** The epoch at which the stake becomes active. */
		stake_activation_epoch: bcs.u64(),
		/** The staked SUI tokens. */
		principal: balance.Balance,
	},
});
export const FungibleStakedSui = new MoveStruct({
	name: `${$moduleName}::FungibleStakedSui`,
	fields: {
		id: bcs.Address,
		/** ID of the staking pool we are staking with. */
		pool_id: bcs.Address,
		/** The pool token amount. */
		value: bcs.u64(),
	},
});
export const FungibleStakedSuiData = new MoveStruct({
	name: `${$moduleName}::FungibleStakedSuiData`,
	fields: {
		id: bcs.Address,
		/** fungible_staked_sui supply */
		total_supply: bcs.u64(),
		/** principal balance. Rewards are withdrawn from the reward pool */
		principal: balance.Balance,
	},
});
export const FungibleStakedSuiDataKey = new MoveStruct({
	name: `${$moduleName}::FungibleStakedSuiDataKey`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const UnderflowSuiBalance = new MoveStruct({
	name: `${$moduleName}::UnderflowSuiBalance`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface SuiBalanceArguments {
	pool: RawTransactionArgument<string>;
}
export interface SuiBalanceOptions {
	package: string;
	arguments: SuiBalanceArguments | [pool: RawTransactionArgument<string>];
}
export function suiBalance(options: SuiBalanceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'sui_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PoolIdArguments {
	stakedSui: RawTransactionArgument<string>;
}
export interface PoolIdOptions {
	package: string;
	arguments: PoolIdArguments | [stakedSui: RawTransactionArgument<string>];
}
export function poolId(options: PoolIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['stakedSui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'pool_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FungibleStakedSuiPoolIdArguments {
	fungibleStakedSui: RawTransactionArgument<string>;
}
export interface FungibleStakedSuiPoolIdOptions {
	package: string;
	arguments: FungibleStakedSuiPoolIdArguments | [fungibleStakedSui: RawTransactionArgument<string>];
}
export function fungibleStakedSuiPoolId(options: FungibleStakedSuiPoolIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['fungibleStakedSui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'fungible_staked_sui_pool_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StakedSuiAmountArguments {
	stakedSui: RawTransactionArgument<string>;
}
export interface StakedSuiAmountOptions {
	package: string;
	arguments: StakedSuiAmountArguments | [stakedSui: RawTransactionArgument<string>];
}
/** Returns the principal amount of `StakedSui`. */
export function stakedSuiAmount(options: StakedSuiAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['stakedSui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'staked_sui_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StakeActivationEpochArguments {
	stakedSui: RawTransactionArgument<string>;
}
export interface StakeActivationEpochOptions {
	package: string;
	arguments: StakeActivationEpochArguments | [stakedSui: RawTransactionArgument<string>];
}
/** Returns the activation epoch of `StakedSui`. */
export function stakeActivationEpoch(options: StakeActivationEpochOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['stakedSui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'stake_activation_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsPreactiveArguments {
	pool: RawTransactionArgument<string>;
}
export interface IsPreactiveOptions {
	package: string;
	arguments: IsPreactiveArguments | [pool: RawTransactionArgument<string>];
}
/** Returns true if the input staking pool is preactive. */
export function isPreactive(options: IsPreactiveOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'is_preactive',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsInactiveArguments {
	pool: RawTransactionArgument<string>;
}
export interface IsInactiveOptions {
	package: string;
	arguments: IsInactiveArguments | [pool: RawTransactionArgument<string>];
}
/** Returns true if the input staking pool is inactive. */
export function isInactive(options: IsInactiveOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'is_inactive',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FungibleStakedSuiValueArguments {
	fungibleStakedSui: RawTransactionArgument<string>;
}
export interface FungibleStakedSuiValueOptions {
	package: string;
	arguments: FungibleStakedSuiValueArguments | [fungibleStakedSui: RawTransactionArgument<string>];
}
export function fungibleStakedSuiValue(options: FungibleStakedSuiValueOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['fungibleStakedSui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'fungible_staked_sui_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SplitFungibleStakedSuiArguments {
	fungibleStakedSui: RawTransactionArgument<string>;
	splitAmount: RawTransactionArgument<number | bigint>;
}
export interface SplitFungibleStakedSuiOptions {
	package: string;
	arguments:
		| SplitFungibleStakedSuiArguments
		| [
				fungibleStakedSui: RawTransactionArgument<string>,
				splitAmount: RawTransactionArgument<number | bigint>,
		  ];
}
export function splitFungibleStakedSui(options: SplitFungibleStakedSuiOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['fungibleStakedSui', 'splitAmount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'split_fungible_staked_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface JoinFungibleStakedSuiArguments {
	self: RawTransactionArgument<string>;
	other: RawTransactionArgument<string>;
}
export interface JoinFungibleStakedSuiOptions {
	package: string;
	arguments:
		| JoinFungibleStakedSuiArguments
		| [self: RawTransactionArgument<string>, other: RawTransactionArgument<string>];
}
export function joinFungibleStakedSui(options: JoinFungibleStakedSuiOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'other'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'join_fungible_staked_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SplitArguments {
	self: RawTransactionArgument<string>;
	splitAmount: RawTransactionArgument<number | bigint>;
}
export interface SplitOptions {
	package: string;
	arguments:
		| SplitArguments
		| [self: RawTransactionArgument<string>, splitAmount: RawTransactionArgument<number | bigint>];
}
/**
 * Split StakedSui `self` to two parts, one with principal `split_amount`, and the
 * remaining principal is left in `self`. All the other parameters of the StakedSui
 * like `stake_activation_epoch` or `pool_id` remain the same.
 */
export function split(options: SplitOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'splitAmount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'split',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SplitStakedSuiArguments {
	stake: RawTransactionArgument<string>;
	splitAmount: RawTransactionArgument<number | bigint>;
}
export interface SplitStakedSuiOptions {
	package: string;
	arguments:
		| SplitStakedSuiArguments
		| [stake: RawTransactionArgument<string>, splitAmount: RawTransactionArgument<number | bigint>];
}
/**
 * Split the given StakedSui to the two parts, one with principal `split_amount`,
 * transfer the newly split part to the sender address.
 */
export function splitStakedSui(options: SplitStakedSuiOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['stake', 'splitAmount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'split_staked_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface JoinStakedSuiArguments {
	self: RawTransactionArgument<string>;
	other: RawTransactionArgument<string>;
}
export interface JoinStakedSuiOptions {
	package: string;
	arguments:
		| JoinStakedSuiArguments
		| [self: RawTransactionArgument<string>, other: RawTransactionArgument<string>];
}
/**
 * Consume the staked sui `other` and add its value to `self`. Aborts if some of
 * the staking parameters are incompatible (pool id, stake activation epoch, etc.)
 */
export function joinStakedSui(options: JoinStakedSuiOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'other'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'join_staked_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsEqualStakingMetadataArguments {
	self: RawTransactionArgument<string>;
	other: RawTransactionArgument<string>;
}
export interface IsEqualStakingMetadataOptions {
	package: string;
	arguments:
		| IsEqualStakingMetadataArguments
		| [self: RawTransactionArgument<string>, other: RawTransactionArgument<string>];
}
/**
 * Returns true if all the staking parameters of the staked sui except the
 * principal are identical
 */
export function isEqualStakingMetadata(options: IsEqualStakingMetadataOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'other'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'is_equal_staking_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PoolTokenExchangeRateAtEpochArguments {
	pool: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
}
export interface PoolTokenExchangeRateAtEpochOptions {
	package: string;
	arguments:
		| PoolTokenExchangeRateAtEpochArguments
		| [pool: RawTransactionArgument<string>, epoch: RawTransactionArgument<number | bigint>];
}
export function poolTokenExchangeRateAtEpoch(options: PoolTokenExchangeRateAtEpochOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['pool', 'epoch'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'pool_token_exchange_rate_at_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PendingStakeAmountArguments {
	stakingPool: RawTransactionArgument<string>;
}
export interface PendingStakeAmountOptions {
	package: string;
	arguments: PendingStakeAmountArguments | [stakingPool: RawTransactionArgument<string>];
}
/** Returns the total value of the pending staking requests for this staking pool. */
export function pendingStakeAmount(options: PendingStakeAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['stakingPool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'pending_stake_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PendingStakeWithdrawAmountArguments {
	stakingPool: RawTransactionArgument<string>;
}
export interface PendingStakeWithdrawAmountOptions {
	package: string;
	arguments: PendingStakeWithdrawAmountArguments | [stakingPool: RawTransactionArgument<string>];
}
/** Returns the total withdrawal from the staking pool this epoch. */
export function pendingStakeWithdrawAmount(options: PendingStakeWithdrawAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['stakingPool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'pending_stake_withdraw_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SuiAmountArguments {
	exchangeRate: RawTransactionArgument<string>;
}
export interface SuiAmountOptions {
	package: string;
	arguments: SuiAmountArguments | [exchangeRate: RawTransactionArgument<string>];
}
export function suiAmount(options: SuiAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['exchangeRate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'sui_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PoolTokenAmountArguments {
	exchangeRate: RawTransactionArgument<string>;
}
export interface PoolTokenAmountOptions {
	package: string;
	arguments: PoolTokenAmountArguments | [exchangeRate: RawTransactionArgument<string>];
}
export function poolTokenAmount(options: PoolTokenAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['exchangeRate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking_pool',
			function: 'pool_token_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
