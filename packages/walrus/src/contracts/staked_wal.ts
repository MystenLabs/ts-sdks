// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import * as balance from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/balance.js';
import * as object from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/object.js';
import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function StakedWal() {
	return bcs.struct('StakedWal', {
		id: object.UID(),
		state: StakedWalState(),
		node_id: bcs.Address,
		principal: balance.Balance(),
		activation_epoch: bcs.u32(),
	});
}
export function StakedWalState() {
	return bcs.enum('StakedWalState', {
		Staked: null,
		Withdrawing: bcs.u32(),
	});
}
export function init(packageAddress: string) {
	function mint(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			`0x0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<${packageAddress}::wal::WAL>`,
			'u32',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'mint',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function into_balance(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'into_balance',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_withdrawing(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`, 'u32'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'set_withdrawing',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function can_withdraw_early(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<boolean>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staked_wal::StakedWal`,
			'bool',
			`${packageAddress}::walrus_context::WalrusContext`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'can_withdraw_early',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function node_id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'node_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function value(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'value',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function activation_epoch(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'activation_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function is_staked(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'is_staked',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function is_withdrawing(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'is_withdrawing',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function withdraw_epoch(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'withdraw_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function join(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staked_wal::StakedWal`,
			`${packageAddress}::staked_wal::StakedWal`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'join',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function split(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`, 'u64'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'split',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function destroy_zero(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'destroy_zero',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		mint,
		into_balance,
		set_withdrawing,
		can_withdraw_early,
		node_id,
		value,
		activation_epoch,
		is_staked,
		is_withdrawing,
		withdraw_epoch,
		join,
		split,
		destroy_zero,
	};
}
