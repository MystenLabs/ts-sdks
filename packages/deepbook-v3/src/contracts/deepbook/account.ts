// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Account module manages the account data for each user. */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import * as vec_set from './deps/sui/vec_set.js';
import * as balances from './balances.js';
const $moduleName = '@deepbook/core::account';
export const Account = new MoveStruct({
	name: `${$moduleName}::Account`,
	fields: {
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
		owed_balances: balances.Balances,
	},
});
export interface OpenOrdersArguments {
	self: RawTransactionArgument<string>;
}
export interface OpenOrdersOptions {
	package?: string;
	arguments: OpenOrdersArguments | [self: RawTransactionArgument<string>];
}
export function openOrders(options: OpenOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::account::Account`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'open_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TakerVolumeArguments {
	self: RawTransactionArgument<string>;
}
export interface TakerVolumeOptions {
	package?: string;
	arguments: TakerVolumeArguments | [self: RawTransactionArgument<string>];
}
export function takerVolume(options: TakerVolumeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::account::Account`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'taker_volume',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MakerVolumeArguments {
	self: RawTransactionArgument<string>;
}
export interface MakerVolumeOptions {
	package?: string;
	arguments: MakerVolumeArguments | [self: RawTransactionArgument<string>];
}
export function makerVolume(options: MakerVolumeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::account::Account`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'maker_volume',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TotalVolumeArguments {
	self: RawTransactionArgument<string>;
}
export interface TotalVolumeOptions {
	package?: string;
	arguments: TotalVolumeArguments | [self: RawTransactionArgument<string>];
}
export function totalVolume(options: TotalVolumeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::account::Account`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'total_volume',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ActiveStakeArguments {
	self: RawTransactionArgument<string>;
}
export interface ActiveStakeOptions {
	package?: string;
	arguments: ActiveStakeArguments | [self: RawTransactionArgument<string>];
}
export function activeStake(options: ActiveStakeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::account::Account`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'active_stake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InactiveStakeArguments {
	self: RawTransactionArgument<string>;
}
export interface InactiveStakeOptions {
	package?: string;
	arguments: InactiveStakeArguments | [self: RawTransactionArgument<string>];
}
export function inactiveStake(options: InactiveStakeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::account::Account`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'inactive_stake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreatedProposalArguments {
	self: RawTransactionArgument<string>;
}
export interface CreatedProposalOptions {
	package?: string;
	arguments: CreatedProposalArguments | [self: RawTransactionArgument<string>];
}
export function createdProposal(options: CreatedProposalOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::account::Account`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'created_proposal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VotedProposalArguments {
	self: RawTransactionArgument<string>;
}
export interface VotedProposalOptions {
	package?: string;
	arguments: VotedProposalArguments | [self: RawTransactionArgument<string>];
}
export function votedProposal(options: VotedProposalOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::account::Account`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'voted_proposal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SettledBalancesArguments {
	self: RawTransactionArgument<string>;
}
export interface SettledBalancesOptions {
	package?: string;
	arguments: SettledBalancesArguments | [self: RawTransactionArgument<string>];
}
export function settledBalances(options: SettledBalancesOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::account::Account`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'settled_balances',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
