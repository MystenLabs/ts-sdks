/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, MoveEnum } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as group_ops from './deps/sui/group_ops.js';
const $moduleName = '@local-pkg/walrus::bls_aggregate';
export const BlsCommitteeMember = new MoveStruct({
	name: `${$moduleName}::BlsCommitteeMember`,
	fields: {
		public_key: group_ops.Element,
		weight: bcs.u16(),
		node_id: bcs.Address,
	},
});
export const BlsCommittee = new MoveStruct({
	name: `${$moduleName}::BlsCommittee`,
	fields: {
		/** A vector of committee members */
		members: bcs.vector(BlsCommitteeMember),
		/** The total number of shards held by the committee */
		n_shards: bcs.u16(),
		/** The epoch in which the committee is active. */
		epoch: bcs.u32(),
		/** The aggregation of public keys for all members of the committee */
		total_aggregated_key: group_ops.Element,
	},
});
/** The type of weight verification to perform. */
export const RequiredWeight = new MoveEnum({
	name: `${$moduleName}::RequiredWeight`,
	fields: {
		/** Verify that the signers form a quorum. */
		Quorum: null,
		/** Verify that the signers include at least one correct node. */
		OneCorrectNode: null,
	},
});
