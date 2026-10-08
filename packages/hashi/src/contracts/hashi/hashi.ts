/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The root shared object of the bridge. `Hashi` aggregates every subsystem —
 * committee set, the instant and epoch configs, versioning, treasury, governance
 * proposals, and TOB certificate storage — and hangs per-chain state (e.g.
 * `BitcoinState`) off its `UID` as dynamic fields. It also provides the
 * package-wide guards (pause, reconfig, committee-signature verification) that
 * entry functions in other modules call through, and the one-time `finish_publish`
 * launch switch that hands the package `UpgradeCap` into on-chain custody.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as committee_set from './committee_set.js';
import * as config from './config.js';
import * as versioning from './versioning.js';
import * as treasury from './treasury.js';
import * as proposals from './proposals.js';
import * as bag from './deps/sui/bag.js';
import * as mpc_signing from './mpc_signing.js';
const $moduleName = '@local-pkg/hashi::hashi';
export const Hashi = new MoveStruct({
	name: `${$moduleName}::Hashi`,
	fields: {
		id: bcs.Address,
		committee_set: committee_set.CommitteeSet,
		/**
		 * Governed values that take effect the moment a proposal executes. Never copied
		 * onto a committee.
		 */
		config: config.Config,
		/**
		 * Governed values that take effect at the next committee formation:
		 * `start_reconfig` copies the whole store onto the new committee, so every key in
		 * it is fixed for that committee's lifetime. Holds the MPC parameters plus any
		 * epoch-scoped keys governance adds.
		 */
		epoch_config: config.Config,
		versioning: versioning.Versioning,
		treasury: treasury.Treasury,
		proposals: proposals.Proposals,
		/**
		 * TOB certificates by (epoch, batch_index, protocol_type). Every value is an
		 * `EpochCertsV1` bucket.
		 */
		tob: bag.Bag,
		/**
		 * The only source of `Presig` handles for the current epoch. The presignatures
		 * themselves come from the committee's off-chain presigning protocol.
		 */
		presig_allocator: mpc_signing.PresigAllocator,
	},
});
export interface FinishPublishArguments {
	self: RawTransactionArgument<string>;
	upgradeCap: RawTransactionArgument<string>;
	bitcoinChainId: RawTransactionArgument<string>;
	guardianUrl: RawTransactionArgument<string>;
	guardianNodeUrl: RawTransactionArgument<string>;
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
				self: RawTransactionArgument<string>,
				upgradeCap: RawTransactionArgument<string>,
				bitcoinChainId: RawTransactionArgument<string>,
				guardianUrl: RawTransactionArgument<string>,
				guardianNodeUrl: RawTransactionArgument<string>,
				guardianBtcPublicKey: RawTransactionArgument<Array<number>>,
				bitcoinConfirmationThreshold: RawTransactionArgument<number | bigint | null>,
				bitcoinDepositTimeDelayMs: RawTransactionArgument<number | bigint | null>,
				coinRegistry: RawTransactionArgument<string>,
		  ];
}
export function finishPublish(options: FinishPublishOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [
		null,
		null,
		'address',
		'0x1::string::String',
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
		'guardianNodeUrl',
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
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
