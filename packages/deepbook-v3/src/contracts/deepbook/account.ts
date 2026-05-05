/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/** Account module manages the account data for each user. */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionResult, type TransactionArgument } from '@mysten/sui/transactions';
import * as vec_set from './deps/sui/vec_set.js';
import * as balances from './balances.js';
const $moduleName = '@deepbook/core::account';
export const Account: MoveStruct<{
    "epoch": ReturnType<typeof bcs.u64>;
    "open_orders": ReturnType<typeof vec_set.VecSet<ReturnType<typeof bcs.u128>>>;
    "taker_volume": ReturnType<typeof bcs.u128>;
    "maker_volume": ReturnType<typeof bcs.u128>;
    "active_stake": ReturnType<typeof bcs.u64>;
    "inactive_stake": ReturnType<typeof bcs.u64>;
    "created_proposal": ReturnType<typeof bcs.bool>;
    "voted_proposal": ReturnType<typeof bcs.option<typeof bcs.Address>>;
    "unclaimed_rebates": typeof balances.Balances;
    "settled_balances": typeof balances.Balances;
    "owed_balances": typeof balances.Balances;
}> = new MoveStruct({ name: `${$moduleName}::Account`, fields: {
        epoch: bcs.u64(),
        open_orders: vec_set.VecSet(bcs.u128()),
        taker_volume: bcs.u128(),
        maker_volume: bcs.u128(),
        active_stake: bcs.u64(),
        inactive_stake: bcs.u64(),
        created_proposal: bcs.bool(),
        voted_proposal: bcs.option(bcs.Address),
        unclaimed_rebates: balances.Balances,
        settled_balances: balances.Balances,
        owed_balances: balances.Balances
    } });
export interface OpenOrdersArguments {
    self: TransactionArgument;
}
export interface OpenOrdersOptions {
    package?: string;
    arguments: OpenOrdersArguments | [
        self: TransactionArgument
    ];
}
export function openOrders(options: OpenOrdersOptions): (tx: Transaction) => TransactionResult {
    const packageAddress = options.package ?? '@deepbook/core';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'account',
        function: 'open_orders',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface TakerVolumeArguments {
    self: TransactionArgument;
}
export interface TakerVolumeOptions {
    package?: string;
    arguments: TakerVolumeArguments | [
        self: TransactionArgument
    ];
}
export function takerVolume(options: TakerVolumeOptions): (tx: Transaction) => TransactionResult {
    const packageAddress = options.package ?? '@deepbook/core';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'account',
        function: 'taker_volume',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface MakerVolumeArguments {
    self: TransactionArgument;
}
export interface MakerVolumeOptions {
    package?: string;
    arguments: MakerVolumeArguments | [
        self: TransactionArgument
    ];
}
export function makerVolume(options: MakerVolumeOptions): (tx: Transaction) => TransactionResult {
    const packageAddress = options.package ?? '@deepbook/core';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'account',
        function: 'maker_volume',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface TotalVolumeArguments {
    self: TransactionArgument;
}
export interface TotalVolumeOptions {
    package?: string;
    arguments: TotalVolumeArguments | [
        self: TransactionArgument
    ];
}
export function totalVolume(options: TotalVolumeOptions): (tx: Transaction) => TransactionResult {
    const packageAddress = options.package ?? '@deepbook/core';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'account',
        function: 'total_volume',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface ActiveStakeArguments {
    self: TransactionArgument;
}
export interface ActiveStakeOptions {
    package?: string;
    arguments: ActiveStakeArguments | [
        self: TransactionArgument
    ];
}
export function activeStake(options: ActiveStakeOptions): (tx: Transaction) => TransactionResult {
    const packageAddress = options.package ?? '@deepbook/core';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'account',
        function: 'active_stake',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface InactiveStakeArguments {
    self: TransactionArgument;
}
export interface InactiveStakeOptions {
    package?: string;
    arguments: InactiveStakeArguments | [
        self: TransactionArgument
    ];
}
export function inactiveStake(options: InactiveStakeOptions): (tx: Transaction) => TransactionResult {
    const packageAddress = options.package ?? '@deepbook/core';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'account',
        function: 'inactive_stake',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface CreatedProposalArguments {
    self: TransactionArgument;
}
export interface CreatedProposalOptions {
    package?: string;
    arguments: CreatedProposalArguments | [
        self: TransactionArgument
    ];
}
export function createdProposal(options: CreatedProposalOptions): (tx: Transaction) => TransactionResult {
    const packageAddress = options.package ?? '@deepbook/core';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'account',
        function: 'created_proposal',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface VotedProposalArguments {
    self: TransactionArgument;
}
export interface VotedProposalOptions {
    package?: string;
    arguments: VotedProposalArguments | [
        self: TransactionArgument
    ];
}
export function votedProposal(options: VotedProposalOptions): (tx: Transaction) => TransactionResult {
    const packageAddress = options.package ?? '@deepbook/core';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'account',
        function: 'voted_proposal',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface SettledBalancesArguments {
    self: TransactionArgument;
}
export interface SettledBalancesOptions {
    package?: string;
    arguments: SettledBalancesArguments | [
        self: TransactionArgument
    ];
}
export function settledBalances(options: SettledBalancesOptions): (tx: Transaction) => TransactionResult {
    const packageAddress = options.package ?? '@deepbook/core';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'account',
        function: 'settled_balances',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}