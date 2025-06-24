// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Module to wrap all constants used across the project. A singleton and not meant
 * to be modified (only extended).
 *
 * This module is free from any non-framework dependencies and serves as a single
 * place of storing constants and proving convenient APIs for reading.
 */

import type { Transaction } from '@mysten/sui/transactions';
/** Top level domain for SUI as a String. */
export function sui_tld(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'sui_tld',
		});
}
/** Default value for the image_url. */
export function default_image(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'default_image',
		});
}
/** The amount of MIST in 1 SUI. */
export function mist_per_sui(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'mist_per_sui',
		});
}
/** The minimum length of a domain name. */
export function min_domain_length(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'min_domain_length',
		});
}
/** The maximum length of a domain name. */
export function max_domain_length(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'max_domain_length',
		});
}
/** Maximum value for basis points. */
export function max_bps(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'max_bps',
		});
}
/** The amount of milliseconds in a year. */
export function year_ms(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'year_ms',
		});
}
/** Grace period in milliseconds after which the domain expires. */
export function grace_period_ms(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'grace_period_ms',
		});
}
/** Subdomain constants The NameRecord key that a subdomain can create child names. */
export function subdomain_allow_creation_key(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'subdomain_allow_creation_key',
		});
}
/** The NameRecord key that a subdomain can self-renew. */
export function subdomain_allow_extension_key(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'subdomain_allow_extension_key',
		});
}
/** A getter for a leaf name record's expiration timestamp. */
export function leaf_expiration_timestamp(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'leaf_expiration_timestamp',
		});
}
