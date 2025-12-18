/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

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

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as domain_1 from './domain.js';
const $moduleName = '@suins/core::suins_registration';
export const SuinsRegistration = new MoveStruct({
	name: `${$moduleName}::SuinsRegistration`,
	fields: {
		id: bcs.Address,
		/** The parsed domain. */
		domain: domain_1.Domain,
		/** The domain name that the NFT is for. */
		domain_name: bcs.string(),
		/** Timestamp in milliseconds when this NFT expires. */
		expiration_timestamp_ms: bcs.u64(),
		/** Short IPFS hash of the image to be displayed for the NFT. */
		image_url: bcs.string(),
	},
});
export interface HasExpiredArguments {
	self: RawTransactionArgument<string>;
}
export interface HasExpiredOptions {
	package?: string;
	arguments: HasExpiredArguments | [self: RawTransactionArgument<string>];
}
/**
 * Check whether the `SuinsRegistration` has expired by comparing the expiration
 * timeout with the current time.
 */
export function hasExpired(options: HasExpiredOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins_registration',
			function: 'has_expired',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface HasExpiredPastGracePeriodArguments {
	self: RawTransactionArgument<string>;
}
export interface HasExpiredPastGracePeriodOptions {
	package?: string;
	arguments: HasExpiredPastGracePeriodArguments | [self: RawTransactionArgument<string>];
}
/**
 * Check whether the `SuinsRegistration` has expired by comparing the expiration
 * timeout with the current time. This function also takes into account the grace
 * period.
 */
export function hasExpiredPastGracePeriod(options: HasExpiredPastGracePeriodOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins_registration',
			function: 'has_expired_past_grace_period',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DomainArguments {
	self: RawTransactionArgument<string>;
}
export interface DomainOptions {
	package?: string;
	arguments: DomainArguments | [self: RawTransactionArgument<string>];
}
/** Get the `domain` field of the `SuinsRegistration`. */
export function domain(options: DomainOptions) {
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
export interface DomainNameArguments {
	self: RawTransactionArgument<string>;
}
export interface DomainNameOptions {
	package?: string;
	arguments: DomainNameArguments | [self: RawTransactionArgument<string>];
}
/** Get the `domain_name` field of the `SuinsRegistration`. */
export function domainName(options: DomainNameOptions) {
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
export interface ExpirationTimestampMsArguments {
	self: RawTransactionArgument<string>;
}
export interface ExpirationTimestampMsOptions {
	package?: string;
	arguments: ExpirationTimestampMsArguments | [self: RawTransactionArgument<string>];
}
/** Get the `expiration_timestamp_ms` field of the `SuinsRegistration`. */
export function expirationTimestampMs(options: ExpirationTimestampMsOptions) {
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
export interface ImageUrlArguments {
	self: RawTransactionArgument<string>;
}
export interface ImageUrlOptions {
	package?: string;
	arguments: ImageUrlArguments | [self: RawTransactionArgument<string>];
}
/** Get the `image_url` field of the `SuinsRegistration`. */
export function imageUrl(options: ImageUrlOptions) {
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
export interface UidArguments {
	self: RawTransactionArgument<string>;
}
export interface UidOptions {
	package?: string;
	arguments: UidArguments | [self: RawTransactionArgument<string>];
}
export function uid(options: UidOptions) {
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
export interface UidMutArguments {
	self: RawTransactionArgument<string>;
}
export interface UidMutOptions {
	package?: string;
	arguments: UidMutArguments | [self: RawTransactionArgument<string>];
}
/** Get the mutable `id` field of the `SuinsRegistration`. */
export function uidMut(options: UidMutOptions) {
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
