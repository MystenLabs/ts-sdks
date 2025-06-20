// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import * as group_ops from './deps/sui/group_ops.js';
export function BlsCommitteeMember() {
	return bcs.struct('BlsCommitteeMember', {
		public_key: group_ops.Element(),
		weight: bcs.u16(),
		node_id: bcs.Address,
	});
}
export function BlsCommittee() {
	return bcs.struct('BlsCommittee', {
		/** A vector of committee members */
		members: bcs.vector(BlsCommitteeMember()),
		/** The total number of shards held by the committee */
		n_shards: bcs.u16(),
		/** The epoch in which the committee is active. */
		epoch: bcs.u32(),
		/** The aggregation of public keys for all members of the committee */
		total_aggregated_key: group_ops.Element(),
	});
}
/** The type of weight verification to perform. */
export function RequiredWeight() {
	return bcs.enum('RequiredWeight', {
		/** Verify that the signers form a quorum. */
		Quorum: null,
		/** Verify that the signers include at least one correct node. */
		OneCorrectNode: null,
	});
}
