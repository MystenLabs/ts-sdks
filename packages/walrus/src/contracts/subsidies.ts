// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import * as balance from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/balance.js';
import * as object from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/object.js';
import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function AdminCap() {
	return bcs.struct('AdminCap', {
		id: object.UID(),
		subsidies_id: bcs.Address,
	});
}
export function Subsidies() {
	return bcs.struct('Subsidies', {
		id: object.UID(),
		buyer_subsidy_rate: bcs.u16(),
		system_subsidy_rate: bcs.u16(),
		subsidy_pool: balance.Balance(),
		package_id: bcs.Address,
		version: bcs.u64(),
	});
}
export function init(packageAddress: string) {
	function _new(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function new_with_initial_rates_and_funds(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number>,
			RawTransactionArgument<number>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			'u16',
			'u16',
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'new_with_initial_rates_and_funds',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function add_funds(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::subsidies::Subsidies`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'add_funds',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function check_admin(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::subsidies::Subsidies`,
			`${packageAddress}::subsidies::AdminCap`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'check_admin',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function check_version_upgrade(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::subsidies::Subsidies`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'check_version_upgrade',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_buyer_subsidy_rate(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::subsidies::Subsidies`,
			`${packageAddress}::subsidies::AdminCap`,
			'u16',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'set_buyer_subsidy_rate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_system_subsidy_rate(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::subsidies::Subsidies`,
			`${packageAddress}::subsidies::AdminCap`,
			'u16',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'set_system_subsidy_rate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function apply_subsidies(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::subsidies::Subsidies`,
			'u64',
			'u32',
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
			`${packageAddress}::system::System`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'apply_subsidies',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function extend_blob(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::subsidies::Subsidies`,
			`${packageAddress}::system::System`,
			`${packageAddress}::blob::Blob`,
			'u32',
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'extend_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function reserve_space(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::subsidies::Subsidies`,
			`${packageAddress}::system::System`,
			'u64',
			'u32',
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'reserve_space',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function migrate(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::subsidies::Subsidies`,
			`${packageAddress}::subsidies::AdminCap`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'migrate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function admin_cap_subsidies_id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::subsidies::AdminCap`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'admin_cap_subsidies_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function subsidy_pool_value(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::subsidies::Subsidies`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'subsidy_pool_value',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function buyer_subsidy_rate(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::subsidies::Subsidies`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'buyer_subsidy_rate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function system_subsidy_rate(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::subsidies::Subsidies`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'system_subsidy_rate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		_new,
		new_with_initial_rates_and_funds,
		add_funds,
		check_admin,
		check_version_upgrade,
		set_buyer_subsidy_rate,
		set_system_subsidy_rate,
		apply_subsidies,
		extend_blob,
		reserve_space,
		migrate,
		admin_cap_subsidies_id,
		subsidy_pool_value,
		buyer_subsidy_rate,
		system_subsidy_rate,
	};
}
