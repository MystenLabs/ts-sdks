/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Module to wrap all constants used across the project. A singleton and not meant
 * to be modified (only extended).
 *
 * This module is free from any non-framework dependencies and serves as a single
 * place of storing constants and proving convenient APIs for reading.
 */

import { type Transaction } from '@mysten/sui/transactions';
export interface SuiTldOptions {
	package?: string;
	arguments?: [];
	config?: {
		packageId?: string;
	};
}
/** Top level domain for SUI as a String. */
export function suiTld(options: SuiTldOptions = {}) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'sui_tld',
		});
}
export interface DefaultImageOptions {
	package?: string;
	arguments?: [];
	config?: {
		packageId?: string;
	};
}
/** Default value for the image_url. */
export function defaultImage(options: DefaultImageOptions = {}) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'default_image',
		});
}
export interface MistPerSuiOptions {
	package?: string;
	arguments?: [];
	config?: {
		packageId?: string;
	};
}
/** The amount of MIST in 1 SUI. */
export function mistPerSui(options: MistPerSuiOptions = {}) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'mist_per_sui',
		});
}
export interface MinDomainLengthOptions {
	package?: string;
	arguments?: [];
	config?: {
		packageId?: string;
	};
}
/** The minimum length of a domain name. */
export function minDomainLength(options: MinDomainLengthOptions = {}) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'min_domain_length',
		});
}
export interface MaxDomainLengthOptions {
	package?: string;
	arguments?: [];
	config?: {
		packageId?: string;
	};
}
/** The maximum length of a domain name. */
export function maxDomainLength(options: MaxDomainLengthOptions = {}) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'max_domain_length',
		});
}
export interface MaxBpsOptions {
	package?: string;
	arguments?: [];
	config?: {
		packageId?: string;
	};
}
/** Maximum value for basis points. */
export function maxBps(options: MaxBpsOptions = {}) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'max_bps',
		});
}
export interface YearMsOptions {
	package?: string;
	arguments?: [];
	config?: {
		packageId?: string;
	};
}
/** The amount of milliseconds in a year. */
export function yearMs(options: YearMsOptions = {}) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'year_ms',
		});
}
export interface GracePeriodMsOptions {
	package?: string;
	arguments?: [];
	config?: {
		packageId?: string;
	};
}
/** Grace period in milliseconds after which the domain expires. */
export function gracePeriodMs(options: GracePeriodMsOptions = {}) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'grace_period_ms',
		});
}
export interface SubdomainAllowCreationKeyOptions {
	package?: string;
	arguments?: [];
	config?: {
		packageId?: string;
	};
}
/** Subdomain constants The NameRecord key that a subdomain can create child names. */
export function subdomainAllowCreationKey(options: SubdomainAllowCreationKeyOptions = {}) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'subdomain_allow_creation_key',
		});
}
export interface SubdomainAllowExtensionKeyOptions {
	package?: string;
	arguments?: [];
	config?: {
		packageId?: string;
	};
}
/** The NameRecord key that a subdomain can self-renew. */
export function subdomainAllowExtensionKey(options: SubdomainAllowExtensionKeyOptions = {}) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'subdomain_allow_extension_key',
		});
}
export interface LeafExpirationTimestampOptions {
	package?: string;
	arguments?: [];
	config?: {
		packageId?: string;
	};
}
/** A getter for a leaf name record's expiration timestamp. */
export function leafExpirationTimestamp(options: LeafExpirationTimestampOptions = {}) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'leaf_expiration_timestamp',
		});
}
