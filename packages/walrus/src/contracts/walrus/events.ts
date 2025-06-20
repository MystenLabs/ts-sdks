// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Module to emit events. Used to allow filtering all events in the Rust client (as
 * work-around for the lack of composable event filters).
 */

import { bcs } from '@mysten/sui/bcs';
export function BlobRegistered() {
	return bcs.struct('BlobRegistered', {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
		size: bcs.u64(),
		encoding_type: bcs.u8(),
		end_epoch: bcs.u32(),
		deletable: bcs.bool(),
		object_id: bcs.Address,
	});
}
export function BlobCertified() {
	return bcs.struct('BlobCertified', {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
		end_epoch: bcs.u32(),
		deletable: bcs.bool(),
		object_id: bcs.Address,
		is_extension: bcs.bool(),
	});
}
export function BlobDeleted() {
	return bcs.struct('BlobDeleted', {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
		end_epoch: bcs.u32(),
		object_id: bcs.Address,
		was_certified: bcs.bool(),
	});
}
export function InvalidBlobID() {
	return bcs.struct('InvalidBlobID', {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
	});
}
export function EpochChangeStart() {
	return bcs.struct('EpochChangeStart', {
		epoch: bcs.u32(),
	});
}
export function EpochChangeDone() {
	return bcs.struct('EpochChangeDone', {
		epoch: bcs.u32(),
	});
}
export function ShardsReceived() {
	return bcs.struct('ShardsReceived', {
		epoch: bcs.u32(),
		shards: bcs.vector(bcs.u16()),
	});
}
export function EpochParametersSelected() {
	return bcs.struct('EpochParametersSelected', {
		next_epoch: bcs.u32(),
	});
}
export function ShardRecoveryStart() {
	return bcs.struct('ShardRecoveryStart', {
		epoch: bcs.u32(),
		shards: bcs.vector(bcs.u16()),
	});
}
export function ContractUpgraded() {
	return bcs.struct('ContractUpgraded', {
		epoch: bcs.u32(),
		package_id: bcs.Address,
		version: bcs.u64(),
	});
}
export function RegisterDenyListUpdate() {
	return bcs.struct('RegisterDenyListUpdate', {
		epoch: bcs.u32(),
		root: bcs.u256(),
		sequence_number: bcs.u64(),
		node_id: bcs.Address,
	});
}
export function DenyListUpdate() {
	return bcs.struct('DenyListUpdate', {
		epoch: bcs.u32(),
		root: bcs.u256(),
		sequence_number: bcs.u64(),
		node_id: bcs.Address,
	});
}
export function DenyListBlobDeleted() {
	return bcs.struct('DenyListBlobDeleted', {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
	});
}
export function ContractUpgradeProposed() {
	return bcs.struct('ContractUpgradeProposed', {
		epoch: bcs.u32(),
		package_digest: bcs.vector(bcs.u8()),
	});
}
export function ContractUpgradeQuorumReached() {
	return bcs.struct('ContractUpgradeQuorumReached', {
		epoch: bcs.u32(),
		package_digest: bcs.vector(bcs.u8()),
	});
}
