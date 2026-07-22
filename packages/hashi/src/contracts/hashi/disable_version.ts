/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Governance proposal for disabling a package version. Once quorum is reached,
 * `execute` marks the proposed version as disabled in `versioning`, so every entry
 * point guarded by `assert_version_enabled` stops serving calls made through that
 * version — the recovery lever if an upgraded package turns out to be broken.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
	resolveConfigArgument,
	applyConfigArguments,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/hashi::disable_version';
export const DisableVersion = new MoveStruct({
	name: `${$moduleName}::DisableVersion`,
	fields: {
		version: bcs.u64(),
	},
});
export interface ProposeArguments {
	hashi?: RawTransactionArgument<string>;
	validatorAddress: RawTransactionArgument<string>;
	version: RawTransactionArgument<number | bigint>;
	metadata: TransactionArgument;
}
export interface ProposeOptions {
	package?: string;
	arguments:
		| ProposeArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				validatorAddress: RawTransactionArgument<string>,
				version: RawTransactionArgument<number | bigint>,
				metadata: TransactionArgument,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function propose(options: ProposeOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'u64', null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['hashi', 'validatorAddress', 'version', 'metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'disable_version',
			function: 'propose',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'disable_version',
									functionName: 'propose',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface ExecuteArguments {
	hashi?: RawTransactionArgument<string>;
	proposalId: RawTransactionArgument<string>;
}
export interface ExecuteOptions {
	package?: string;
	arguments:
		| ExecuteArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				proposalId: RawTransactionArgument<string>,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function execute(options: ExecuteOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, '0x2::object::ID', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'proposalId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'disable_version',
			function: 'execute',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'disable_version',
									functionName: 'execute',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
