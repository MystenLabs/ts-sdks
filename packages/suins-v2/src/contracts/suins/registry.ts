// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as table from './deps/sui/table.js';
export function Registry() {
	return bcs.struct('Registry', {
		/**
		 * The `registry` table maps `Domain` to `NameRecord`. Added / replaced in the
		 * `add_record` function.
		 */
		registry: table.Table(),
		/**
		 * The `reverse_registry` table maps `address` to `domain_name`. Updated in the
		 * `set_reverse_lookup` function.
		 */
		reverse_registry: table.Table(),
	});
}
export function _new(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<string>]
		| {
				_: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::suins::AdminCap`] satisfies string[];
	const parameterNames = ['_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Attempts to add a new record to the registry without looking at the grace
 * period. Currently used for subdomains where there's no grace period to respect.
 * Returns a `SuinsRegistration` upon success.
 */
export function add_record_ignoring_grace_period(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
				noYears: RawTransactionArgument<number>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				domain: RawTransactionArgument<string>;
				noYears: RawTransactionArgument<number>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::domain::Domain`,
		'u8',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'domain', 'noYears', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'add_record_ignoring_grace_period',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Attempts to add a new record to the registry and returns a `SuinsRegistration`
 * upon success. Only use with second-level names. Enforces a `grace_period` by
 * default. Not suitable for subdomains (unless a grace period is needed).
 */
export function add_record(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
				noYears: RawTransactionArgument<number>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				domain: RawTransactionArgument<string>;
				noYears: RawTransactionArgument<number>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::domain::Domain`,
		'u8',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'domain', 'noYears', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'add_record',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Attempts to burn an NFT and get storage rebates. Only works if the NFT has
 * expired.
 */
export function burn_registration_object(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, nft: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				nft: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'nft', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'burn_registration_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Allow creation of subdomain wrappers only to authorized modules. */
export function wrap_subdomain(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<string>, nft: RawTransactionArgument<string>]
		| {
				_: RawTransactionArgument<string>;
				nft: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['_', 'nft', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'wrap_subdomain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Attempts to burn a subdomain registration object, and also invalidates any
 * records in the registry / reverse registry.
 */
export function burn_subdomain_object(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, nft: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				nft: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::subdomain_registration::SubDomainRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'nft', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'burn_subdomain_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Adds a `leaf` record to the registry. A `leaf` record is a record that is a
 * subdomain and doesn't have an equivalent `SuinsRegistration` object.
 *
 * Instead, the parent's `SuinsRegistration` object is used to manage
 * target_address & remove it / determine expiration.
 *
 * 1.  Leaf records can't have children. They only work as a resolving mechanism.
 * 2.  Leaf records must always have a `target` address (can't point to `none`).
 * 3.  Leaf records do not expire. Their expiration date is actually what defines
 *     their type.
 *
 * Leaf record's expiration is defined by the parent's expiration. Since the parent
 * can only be a `node`, we need to check that the parent's NFT_ID is valid &
 * hasn't expired.
 */
export function add_leaf_record(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
				clock: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				domain: RawTransactionArgument<string>;
				clock: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::domain::Domain`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		'address',
	] satisfies string[];
	const parameterNames = ['self', 'domain', 'clock', 'target'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'add_leaf_record',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Can be used to remove a leaf record. Leaf records do not have any symmetrical
 * `SuinsRegistration` object. Authorization of who calls this is delegated to the
 * authorized module that calls this.
 */
export function remove_leaf_record(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, domain: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				domain: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::domain::Domain`,
	] satisfies string[];
	const parameterNames = ['self', 'domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'remove_leaf_record',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function set_target_address(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
				newTarget: RawTransactionArgument<string | null>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				domain: RawTransactionArgument<string>;
				newTarget: RawTransactionArgument<string | null>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::domain::Domain`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<address>',
	] satisfies string[];
	const parameterNames = ['self', 'domain', 'newTarget'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'set_target_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function unset_reverse_lookup(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, address: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				address: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::registry::Registry`, 'address'] satisfies string[];
	const parameterNames = ['self', 'address'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'unset_reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Reverse lookup can only be set for the record that has the target address. */
export function set_reverse_lookup(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				address: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				address: RawTransactionArgument<string>;
				domain: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		'address',
		`${packageAddress}::domain::Domain`,
	] satisfies string[];
	const parameterNames = ['self', 'address', 'domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'set_reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Update the `expiration_timestamp_ms` of the given `SuinsRegistration` and
 * `NameRecord`. Requires the `SuinsRegistration` to make sure that both timestamps
 * are in sync.
 */
export function set_expiration_timestamp_ms(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				nft: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
				expirationTimestampMs: RawTransactionArgument<number | bigint>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				nft: RawTransactionArgument<string>;
				domain: RawTransactionArgument<string>;
				expirationTimestampMs: RawTransactionArgument<number | bigint>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		`${packageAddress}::domain::Domain`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'nft', 'domain', 'expirationTimestampMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'set_expiration_timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Update the `data` of the given `NameRecord` using a `SuinsRegistration`. Use
 * with caution and validate(!!) that any system fields are not removed
 * (accidentally), when building authorized packages that can write the metadata
 * field.
 */
export function set_data(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
				data: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				domain: RawTransactionArgument<string>;
				data: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::domain::Domain`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::vec_map::VecMap<0x0000000000000000000000000000000000000000000000000000000000000001::string::String, 0x0000000000000000000000000000000000000000000000000000000000000001::string::String>',
	] satisfies string[];
	const parameterNames = ['self', 'domain', 'data'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'set_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Check whether the given `domain` is registered in the `Registry`. */
export function has_record(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, domain: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				domain: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::domain::Domain`,
	] satisfies string[];
	const parameterNames = ['self', 'domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'has_record',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Returns the `NameRecord` associated with the given domain or None. */
export function lookup(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, domain: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				domain: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::domain::Domain`,
	] satisfies string[];
	const parameterNames = ['self', 'domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Returns the `domain_name` associated with the given address or None. */
export function reverse_lookup(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, address: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				address: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::registry::Registry`, 'address'] satisfies string[];
	const parameterNames = ['self', 'address'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Asserts that the provided NFT:
 *
 * 1.  Matches the ID in the corresponding `Record`
 * 2.  Has not expired (does not take into account the grace period)
 */
export function assert_nft_is_authorized(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, nft: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				nft: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'nft', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'assert_nft_is_authorized',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Returns the `data` associated with the given `Domain`. */
export function get_data(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, domain: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				domain: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::domain::Domain`,
	] satisfies string[];
	const parameterNames = ['self', 'domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'get_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
