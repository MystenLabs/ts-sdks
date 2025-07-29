// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Module to emit events. Used to allow filtering all events in the Rust client (as
 * work-around for the lack of composable event filters).
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/walrus::events';
export const BlobRegistered = new MoveStruct({
	name: `${$moduleName}::BlobRegistered`,
	fields: {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
		size: bcs.u64(),
		encoding_type: bcs.u8(),
		end_epoch: bcs.u32(),
		deletable: bcs.bool(),
		object_id: bcs.Address,
	},
});
export const BlobCertified = new MoveStruct({
	name: `${$moduleName}::BlobCertified`,
	fields: {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
		end_epoch: bcs.u32(),
		deletable: bcs.bool(),
		object_id: bcs.Address,
		is_extension: bcs.bool(),
	},
});
export const BlobDeleted = new MoveStruct({
	name: `${$moduleName}::BlobDeleted`,
	fields: {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
		end_epoch: bcs.u32(),
		object_id: bcs.Address,
		was_certified: bcs.bool(),
	},
});
export const InvalidBlobID = new MoveStruct({
	name: `${$moduleName}::InvalidBlobID`,
	fields: {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
	},
});
export const EpochChangeStart = new MoveStruct({
	name: `${$moduleName}::EpochChangeStart`,
	fields: {
		epoch: bcs.u32(),
	},
});
export const EpochChangeDone = new MoveStruct({
	name: `${$moduleName}::EpochChangeDone`,
	fields: {
		epoch: bcs.u32(),
	},
});
export const ShardsReceived = new MoveStruct({
	name: `${$moduleName}::ShardsReceived`,
	fields: {
		epoch: bcs.u32(),
		shards: bcs.vector(bcs.u16()),
	},
});
export const EpochParametersSelected = new MoveStruct({
	name: `${$moduleName}::EpochParametersSelected`,
	fields: {
		next_epoch: bcs.u32(),
	},
});
export const ShardRecoveryStart = new MoveStruct({
	name: `${$moduleName}::ShardRecoveryStart`,
	fields: {
		epoch: bcs.u32(),
		shards: bcs.vector(bcs.u16()),
	},
});
export const ContractUpgraded = new MoveStruct({
	name: `${$moduleName}::ContractUpgraded`,
	fields: {
		epoch: bcs.u32(),
		package_id: bcs.Address,
		version: bcs.u64(),
	},
});
export const RegisterDenyListUpdate = new MoveStruct({
	name: `${$moduleName}::RegisterDenyListUpdate`,
	fields: {
		epoch: bcs.u32(),
		root: bcs.u256(),
		sequence_number: bcs.u64(),
		node_id: bcs.Address,
	},
});
export const DenyListUpdate = new MoveStruct({
	name: `${$moduleName}::DenyListUpdate`,
	fields: {
		epoch: bcs.u32(),
		root: bcs.u256(),
		sequence_number: bcs.u64(),
		node_id: bcs.Address,
	},
});
export const DenyListBlobDeleted = new MoveStruct({
	name: `${$moduleName}::DenyListBlobDeleted`,
	fields: {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
	},
});
export const ContractUpgradeProposed = new MoveStruct({
	name: `${$moduleName}::ContractUpgradeProposed`,
	fields: {
		epoch: bcs.u32(),
		package_digest: bcs.vector(bcs.u8()),
	},
});
export const ContractUpgradeQuorumReached = new MoveStruct({
	name: `${$moduleName}::ContractUpgradeQuorumReached`,
	fields: {
		epoch: bcs.u32(),
		package_digest: bcs.vector(bcs.u8()),
	},
});
