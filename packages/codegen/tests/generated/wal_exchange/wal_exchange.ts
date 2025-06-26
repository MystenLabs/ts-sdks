/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module: wal_exchange */

import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
import * as balance from './deps/sui/balance.js';
export function Exchange() {
	return bcs.struct('Exchange', {
		id: object.UID(),
		wal: balance.Balance(),
		sui: balance.Balance(),
		rate: ExchangeRate(),
		admin: bcs.Address,
	});
}
export function AdminCap() {
	return bcs.struct('AdminCap', {
		id: object.UID(),
	});
}
export function ExchangeRate() {
	return bcs.struct('ExchangeRate', {
		wal: bcs.u64(),
		sui: bcs.u64(),
	});
}
/** Creates a new exchange rate, making sure it is valid. */
export function new_exchange_rate(options: {
	package?: string;
	arguments:
		| [wal: RawTransactionArgument<number | bigint>, sui: RawTransactionArgument<number | bigint>]
		| {
				wal: RawTransactionArgument<number | bigint>;
				sui: RawTransactionArgument<number | bigint>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = ['u64', 'u64'] satisfies string[];
	const parameterNames = ['wal', 'sui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'new_exchange_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Creates a new shared exchange with a 1:1 exchange rate and returns the
 * associated `AdminCap`.
 */
export function _new(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
/**
 * Creates a new shared exchange with a 1:1 exchange rate, funds it with WAL, and
 * returns the associated `AdminCap`.
 */
export function new_funded(options: {
	package?: string;
	arguments:
		| [wal: RawTransactionArgument<string>, amount: RawTransactionArgument<number | bigint>]
		| {
				wal: RawTransactionArgument<string>;
				amount: RawTransactionArgument<number | bigint>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		'u64',
	] satisfies string[];
	const parameterNames = ['wal', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'new_funded',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Adds WAL to the balance stored in the exchange. */
export function add_wal(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				wal: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				wal: RawTransactionArgument<string>;
				amount: RawTransactionArgument<number | bigint>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'wal', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'add_wal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Adds SUI to the balance stored in the exchange. */
export function add_sui(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				sui: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				sui: RawTransactionArgument<string>;
				amount: RawTransactionArgument<number | bigint>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'sui', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'add_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Adds WAL to the balance stored in the exchange. */
export function add_all_wal(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, wal: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				wal: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = ['self', 'wal'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'add_all_wal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Adds SUI to the balance stored in the exchange. */
export function add_all_sui(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, sui: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				sui: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
	] satisfies string[];
	const parameterNames = ['self', 'sui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'add_all_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Withdraws WAL from the balance stored in the exchange. */
export function withdraw_wal(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				adminCap: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				amount: RawTransactionArgument<number | bigint>;
				adminCap: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'u64',
		`${packageAddress}::wal_exchange::AdminCap`,
	] satisfies string[];
	const parameterNames = ['self', 'amount', 'adminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'withdraw_wal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Withdraws SUI from the balance stored in the exchange. */
export function withdraw_sui(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				adminCap: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				amount: RawTransactionArgument<number | bigint>;
				adminCap: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'u64',
		`${packageAddress}::wal_exchange::AdminCap`,
	] satisfies string[];
	const parameterNames = ['self', 'amount', 'adminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'withdraw_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Sets the exchange rate of the exchange to `wal` WAL = `sui` SUI. */
export function set_exchange_rate(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				wal: RawTransactionArgument<number | bigint>,
				sui: RawTransactionArgument<number | bigint>,
				adminCap: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				wal: RawTransactionArgument<number | bigint>;
				sui: RawTransactionArgument<number | bigint>;
				adminCap: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'u64',
		'u64',
		`${packageAddress}::wal_exchange::AdminCap`,
	] satisfies string[];
	const parameterNames = ['self', 'wal', 'sui', 'adminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'set_exchange_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Exchanges the provided SUI coin for WAL at the exchange's rate. */
export function exchange_all_for_wal(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, sui: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				sui: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
	] satisfies string[];
	const parameterNames = ['self', 'sui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'exchange_all_for_wal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Exchanges `amount_sui` out of the provided SUI coin for WAL at the exchange's
 * rate.
 */
export function exchange_for_wal(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				sui: RawTransactionArgument<string>,
				amountSui: RawTransactionArgument<number | bigint>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				sui: RawTransactionArgument<string>;
				amountSui: RawTransactionArgument<number | bigint>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'sui', 'amountSui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'exchange_for_wal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Exchanges the provided WAL coin for SUI at the exchange's rate. */
export function exchange_all_for_sui(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, wal: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				wal: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = ['self', 'wal'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'exchange_all_for_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Exchanges `amount_wal` out of the provided WAL coin for SUI at the exchange's
 * rate.
 */
export function exchange_for_sui(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				wal: RawTransactionArgument<string>,
				amountWal: RawTransactionArgument<number | bigint>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				wal: RawTransactionArgument<string>;
				amountWal: RawTransactionArgument<number | bigint>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'wal', 'amountWal'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'exchange_for_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
