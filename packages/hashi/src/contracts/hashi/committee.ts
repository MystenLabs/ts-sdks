/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * BLS signing committees and certificate verification. A `Committee` pins an
 * epoch's members (validator addresses, BLS public keys, encryption keys, voting
 * weights) together with the MPC parameters snapshotted at reconfig time.
 * `verify_certificate` checks an aggregate BLS12-381 min-pk signature against a
 * signers bitmap, enforces the stake threshold, and wraps the payload in a
 * `CertifiedMessage` as proof of committee approval.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as group_ops from './deps/sui/group_ops.js';
import * as config from './config.js';
const $moduleName = '@local-pkg/hashi::committee';
export const CommitteeMember = new MoveStruct({
	name: `${$moduleName}::CommitteeMember`,
	fields: {
		validator_address: bcs.Address,
		public_key: group_ops.Element,
		encryption_public_key: bcs.vector(bcs.u8()),
		weight: bcs.u64(),
	},
});
export const Committee = new MoveStruct({
	name: `${$moduleName}::Committee`,
	fields: {
		/** The epoch in which the committee is active. */
		epoch: bcs.u64(),
		/** A vector of committee members */
		members: bcs.vector(CommitteeMember),
		/** Total voting weight of the committee. */
		total_weight: bcs.u64(),
		/**
		 * The config pinned for this epoch (the MPC parameters: threshold,
		 * weight-reduction delta, max-faulty bound, nonce-generation protocol),
		 * snapshotted from the governed config at reconfig time.
		 */
		config: config.Config,
	},
});
export const CommitteeSignature = new MoveStruct({
	name: `${$moduleName}::CommitteeSignature`,
	fields: {
		epoch: bcs.u64(),
		signature: bcs.vector(bcs.u8()),
		signers_bitmap: bcs.vector(bcs.u8()),
	},
});
export function CertifiedMessage<T extends BcsType<any>>(...typeParameters: [T]) {
	return new MoveStruct({
		name: `${$moduleName}::CertifiedMessage<${typeParameters[0].name as T['name']}>`,
		fields: {
			message: typeParameters[0],
			signature: CommitteeSignature,
			stake_support: bcs.u64(),
		},
	});
}
export interface NewCommitteeSignatureArguments {
	epoch: RawTransactionArgument<number | bigint>;
	signature: RawTransactionArgument<number[]>;
	signersBitmap: RawTransactionArgument<number[]>;
}
export interface NewCommitteeSignatureOptions {
	package?: string;
	arguments:
		| NewCommitteeSignatureArguments
		| [
				epoch: RawTransactionArgument<number | bigint>,
				signature: RawTransactionArgument<number[]>,
				signersBitmap: RawTransactionArgument<number[]>,
		  ];
}
export function newCommitteeSignature(options: NewCommitteeSignatureOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = ['u64', 'vector<u8>', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['epoch', 'signature', 'signersBitmap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'committee',
			function: 'new_committee_signature',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
