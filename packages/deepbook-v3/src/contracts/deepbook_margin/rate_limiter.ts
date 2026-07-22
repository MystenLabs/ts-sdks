/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Token Bucket rate limiter for controlling withdrawal rates. Reference:
 * https://github.com/code-423n4/2024-11-chainlink/blob/main/contracts/src/ccip/libraries/RateLimiter.sol
 */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@deepbook/margin::rate_limiter';
export const RateLimiter = new MoveStruct({
	name: `${$moduleName}::RateLimiter`,
	fields: {
		available: bcs.u64(),
		last_updated_ms: bcs.u64(),
		capacity: bcs.u64(),
		refill_rate_per_ms: bcs.u64(),
		enabled: bcs.bool(),
	},
});
export interface IsEnabledArguments {
	self: TransactionArgument;
}
export interface IsEnabledOptions {
	package?: string;
	arguments: IsEnabledArguments | [self: TransactionArgument];
}
export function isEnabled(options: IsEnabledOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rate_limiter',
			function: 'is_enabled',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CapacityArguments {
	self: TransactionArgument;
}
export interface CapacityOptions {
	package?: string;
	arguments: CapacityArguments | [self: TransactionArgument];
}
export function capacity(options: CapacityOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rate_limiter',
			function: 'capacity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RefillRatePerMsArguments {
	self: TransactionArgument;
}
export interface RefillRatePerMsOptions {
	package?: string;
	arguments: RefillRatePerMsArguments | [self: TransactionArgument];
}
export function refillRatePerMs(options: RefillRatePerMsOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rate_limiter',
			function: 'refill_rate_per_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
