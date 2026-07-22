/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The root shared object of the bridge. `Hashi` aggregates every subsystem —
 * committee set, config, versioning, treasury, governance proposals, and TOB
 * certificate storage — and hangs per-chain state (e.g. `BitcoinState`) off its
 * `UID` as dynamic fields. It also provides the package-wide guards (pause,
 * reconfig, committee-signature verification) that entry functions in other
 * modules call through, and the one-time `finish_publish` launch switch that hands
 * the package `UpgradeCap` into on-chain custody.
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
import { type Transaction } from '@mysten/sui/transactions';
import * as committee_set from './committee_set.js';
import * as config from './config.js';
import * as versioning from './versioning.js';
import * as treasury from './treasury.js';
import * as proposals from './proposals.js';
import * as bag from './deps/sui/bag.js';
const $moduleName = '@local-pkg/hashi::hashi';
export const Hashi = new MoveStruct({
	name: `${$moduleName}::Hashi`,
	fields: {
		id: bcs.Address,
		committee_set: committee_set.CommitteeSet,
		config: config.Config,
		versioning: versioning.Versioning,
		treasury: treasury.Treasury,
		proposals: proposals.Proposals,
		/** TOB certificates by (epoch, batch_index) -> EpochCertsV1 */
		tob: bag.Bag,
		/**
		 * Number of presignatures consumed in the current epoch. Used by recovering nodes
		 * to derive `(batch_index, index_in_batch)`.
		 */
		num_consumed_presigs: bcs.u64(),
	},
});
export interface FinishPublishArguments {
	self?: RawTransactionArgument<string>;
	upgradeCap: RawTransactionArgument<string>;
	bitcoinChainId: RawTransactionArgument<string>;
	guardianUrl: RawTransactionArgument<string>;
	guardianBtcPublicKey: RawTransactionArgument<Array<number>>;
	bitcoinConfirmationThreshold: RawTransactionArgument<number | bigint | null>;
	bitcoinDepositTimeDelayMs: RawTransactionArgument<number | bigint | null>;
	coinRegistry: RawTransactionArgument<string>;
}
export interface FinishPublishOptions {
	package?: string;
	arguments:
		| FinishPublishArguments
		| [
				self: RawTransactionArgument<string> | undefined,
				upgradeCap: RawTransactionArgument<string>,
				bitcoinChainId: RawTransactionArgument<string>,
				guardianUrl: RawTransactionArgument<string>,
				guardianBtcPublicKey: RawTransactionArgument<Array<number>>,
				bitcoinConfirmationThreshold: RawTransactionArgument<number | bigint | null>,
				bitcoinDepositTimeDelayMs: RawTransactionArgument<number | bigint | null>,
				coinRegistry: RawTransactionArgument<string>,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function finishPublish(options: FinishPublishOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [
		null,
		null,
		'address',
		'0x1::string::String',
		'vector<u8>',
		'0x1::option::Option<u64>',
		'0x1::option::Option<u64>',
		null,
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'upgradeCap',
		'bitcoinChainId',
		'guardianUrl',
		'guardianBtcPublicKey',
		'bitcoinConfirmationThreshold',
		'bitcoinDepositTimeDelayMs',
		'coinRegistry',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'hashi',
			function: 'finish_publish',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'hashi',
									functionName: 'finish_publish',
									parameterIndex: 0,
									parameterName: 'self',
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
