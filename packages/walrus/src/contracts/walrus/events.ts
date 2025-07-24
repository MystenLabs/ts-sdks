// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Module to emit events. Used to allow filtering all events in the Rust client (as
 * work-around for the lack of composable event filters).
 */

import { bcs } from '@mysten/sui/bcs';
import { MoveStruct } from '../utils/index.js';
const $moduleName = '@local-pkg/walrus::events';
export const BlobRegistered = new MoveStruct(`${$moduleName}::BlobRegistered`, {
	epoch: bcs.u32(),
	blob_id: bcs.u256(),
	size: bcs.u64(),
	encoding_type: bcs.u8(),
	end_epoch: bcs.u32(),
	deletable: bcs.bool(),
	object_id: bcs.Address,
});
export const BlobCertified = new MoveStruct(`${$moduleName}::BlobCertified`, {
	epoch: bcs.u32(),
	blob_id: bcs.u256(),
	end_epoch: bcs.u32(),
	deletable: bcs.bool(),
	object_id: bcs.Address,
	is_extension: bcs.bool(),
});
export const BlobDeleted = new MoveStruct(`${$moduleName}::BlobDeleted`, {
	epoch: bcs.u32(),
	blob_id: bcs.u256(),
	end_epoch: bcs.u32(),
	object_id: bcs.Address,
	was_certified: bcs.bool(),
});
export const InvalidBlobID = new MoveStruct(`${$moduleName}::InvalidBlobID`, {
	epoch: bcs.u32(),
	blob_id: bcs.u256(),
});
export const EpochChangeStart = new MoveStruct(`${$moduleName}::EpochChangeStart`, {
	epoch: bcs.u32(),
});
export const EpochChangeDone = new MoveStruct(`${$moduleName}::EpochChangeDone`, {
	epoch: bcs.u32(),
});
export const ShardsReceived = new MoveStruct(`${$moduleName}::ShardsReceived`, {
	epoch: bcs.u32(),
	shards: bcs.vector(bcs.u16()),
});
export const EpochParametersSelected = new MoveStruct(`${$moduleName}::EpochParametersSelected`, {
	next_epoch: bcs.u32(),
});
export const ShardRecoveryStart = new MoveStruct(`${$moduleName}::ShardRecoveryStart`, {
	epoch: bcs.u32(),
	shards: bcs.vector(bcs.u16()),
});
export const ContractUpgraded = new MoveStruct(`${$moduleName}::ContractUpgraded`, {
	epoch: bcs.u32(),
	package_id: bcs.Address,
	version: bcs.u64(),
});
export const RegisterDenyListUpdate = new MoveStruct(`${$moduleName}::RegisterDenyListUpdate`, {
	epoch: bcs.u32(),
	root: bcs.u256(),
	sequence_number: bcs.u64(),
	node_id: bcs.Address,
});
export const DenyListUpdate = new MoveStruct(`${$moduleName}::DenyListUpdate`, {
	epoch: bcs.u32(),
	root: bcs.u256(),
	sequence_number: bcs.u64(),
	node_id: bcs.Address,
});
export const DenyListBlobDeleted = new MoveStruct(`${$moduleName}::DenyListBlobDeleted`, {
	epoch: bcs.u32(),
	blob_id: bcs.u256(),
});
export const ContractUpgradeProposed = new MoveStruct(`${$moduleName}::ContractUpgradeProposed`, {
	epoch: bcs.u32(),
	package_digest: bcs.vector(bcs.u8()),
});
export const ContractUpgradeQuorumReached = new MoveStruct(
	`${$moduleName}::ContractUpgradeQuorumReached`,
	{
		epoch: bcs.u32(),
		package_digest: bcs.vector(bcs.u8()),
	},
);
