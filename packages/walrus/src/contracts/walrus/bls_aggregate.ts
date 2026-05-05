/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, MoveEnum } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as group_ops from './deps/sui/group_ops.js';
const $moduleName = '@local-pkg/walrus::bls_aggregate';
const _BlsCommitteeMemberFields = {
	public_key: group_ops.Element,
	weight: bcs.u16(),
	node_id: bcs.Address,
};
export const BlsCommitteeMember: MoveStruct<typeof _BlsCommitteeMemberFields> = new MoveStruct({
	name: `${$moduleName}::BlsCommitteeMember`,
	fields: _BlsCommitteeMemberFields,
});
const _BlsCommitteeFields = {
	/** A vector of committee members */
	members: bcs.vector(BlsCommitteeMember),
	/** The total number of shards held by the committee */
	n_shards: bcs.u16(),
	/** The epoch in which the committee is active. */
	epoch: bcs.u32(),
	/** The aggregation of public keys for all members of the committee */
	total_aggregated_key: group_ops.Element,
};
export const BlsCommittee: MoveStruct<typeof _BlsCommitteeFields> = new MoveStruct({
	name: `${$moduleName}::BlsCommittee`,
	fields: _BlsCommitteeFields,
});
const _RequiredWeightFields = {
	/** Verify that the signers form a quorum. */
	Quorum: null,
	/** Verify that the signers include at least one correct node. */
	OneCorrectNode: null,
};
/** The type of weight verification to perform. */
export const RequiredWeight: MoveEnum<typeof _RequiredWeightFields> = new MoveEnum({
	name: `${$moduleName}::RequiredWeight`,
	fields: _RequiredWeightFields,
});
