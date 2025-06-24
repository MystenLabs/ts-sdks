// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Handles creation of the `SuinsRegistration`s. Separates the logic of creating a
 * `SuinsRegistration`. New `SuinsRegistration`s can be created only by the
 * `registry` and this module is tightly coupled with it.
 *
 * When reviewing the module, make sure that:
 *
 * - mutable functions can't be called directly by the owner
 * - all getters are public and take an immutable reference
 */

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
import * as domain_0 from './domain.js';
export function SuinsRegistration() {
	return bcs.struct('SuinsRegistration', {
		id: object.UID(),
		/** The parsed domain. */
		domain: domain_0.Domain(),
		/** The domain name that the NFT is for. */
		domain_name: bcs.string(),
		/** Timestamp in milliseconds when this NFT expires. */
		expiration_timestamp_ms: bcs.u64(),
		/** Short IPFS hash of the image to be displayed for the NFT. */
		image_url: bcs.string(),
	});
}
/**
 * Check whether the `SuinsRegistration` has expired by comparing the expiration
 * timeout with the current time.
 */
export function has_expired(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins_registration',
			function: 'has_expired',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Check whether the `SuinsRegistration` has expired by comparing the expiration
 * timeout with the current time. This function also takes into account the grace
 * period.
 */
export function has_expired_past_grace_period(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins_registration',
			function: 'has_expired_past_grace_period',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Get the `domain` field of the `SuinsRegistration`. */
export function domain(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins_registration::SuinsRegistration`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins_registration',
			function: 'domain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Get the `domain_name` field of the `SuinsRegistration`. */
export function domain_name(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins_registration::SuinsRegistration`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins_registration',
			function: 'domain_name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Get the `expiration_timestamp_ms` field of the `SuinsRegistration`. */
export function expiration_timestamp_ms(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins_registration::SuinsRegistration`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins_registration',
			function: 'expiration_timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Get the `image_url` field of the `SuinsRegistration`. */
export function image_url(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins_registration::SuinsRegistration`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins_registration',
			function: 'image_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function uid(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins_registration::SuinsRegistration`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins_registration',
			function: 'uid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Get the mutable `id` field of the `SuinsRegistration`. */
export function uid_mut(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins_registration::SuinsRegistration`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins_registration',
			function: 'uid_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
