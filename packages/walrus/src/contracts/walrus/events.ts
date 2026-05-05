/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Module to emit events. Used to allow filtering all events in the Rust client (as
 * work-around for the lack of composable event filters).
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/walrus::events';
const _BlobRegisteredFields = {
	epoch: bcs.u32(),
	blob_id: bcs.u256(),
	size: bcs.u64(),
	encoding_type: bcs.u8(),
	end_epoch: bcs.u32(),
	deletable: bcs.bool(),
	object_id: bcs.Address,
};
export const BlobRegistered: MoveStruct<typeof _BlobRegisteredFields> = new MoveStruct({
	name: `${$moduleName}::BlobRegistered`,
	fields: _BlobRegisteredFields,
});
const _BlobCertifiedFields = {
	epoch: bcs.u32(),
	blob_id: bcs.u256(),
	end_epoch: bcs.u32(),
	deletable: bcs.bool(),
	object_id: bcs.Address,
	is_extension: bcs.bool(),
};
export const BlobCertified: MoveStruct<typeof _BlobCertifiedFields> = new MoveStruct({
	name: `${$moduleName}::BlobCertified`,
	fields: _BlobCertifiedFields,
});
const _BlobDeletedFields = {
	epoch: bcs.u32(),
	blob_id: bcs.u256(),
	end_epoch: bcs.u32(),
	object_id: bcs.Address,
	was_certified: bcs.bool(),
};
export const BlobDeleted: MoveStruct<typeof _BlobDeletedFields> = new MoveStruct({
	name: `${$moduleName}::BlobDeleted`,
	fields: _BlobDeletedFields,
});
const _InvalidBlobIDFields = {
	epoch: bcs.u32(),
	blob_id: bcs.u256(),
};
export const InvalidBlobID: MoveStruct<typeof _InvalidBlobIDFields> = new MoveStruct({
	name: `${$moduleName}::InvalidBlobID`,
	fields: _InvalidBlobIDFields,
});
const _EpochChangeStartFields = {
	epoch: bcs.u32(),
};
export const EpochChangeStart: MoveStruct<typeof _EpochChangeStartFields> = new MoveStruct({
	name: `${$moduleName}::EpochChangeStart`,
	fields: _EpochChangeStartFields,
});
const _EpochChangeDoneFields = {
	epoch: bcs.u32(),
};
export const EpochChangeDone: MoveStruct<typeof _EpochChangeDoneFields> = new MoveStruct({
	name: `${$moduleName}::EpochChangeDone`,
	fields: _EpochChangeDoneFields,
});
const _ShardsReceivedFields = {
	epoch: bcs.u32(),
	shards: bcs.vector(bcs.u16()),
};
export const ShardsReceived: MoveStruct<typeof _ShardsReceivedFields> = new MoveStruct({
	name: `${$moduleName}::ShardsReceived`,
	fields: _ShardsReceivedFields,
});
const _EpochParametersSelectedFields = {
	next_epoch: bcs.u32(),
};
export const EpochParametersSelected: MoveStruct<typeof _EpochParametersSelectedFields> =
	new MoveStruct({
		name: `${$moduleName}::EpochParametersSelected`,
		fields: _EpochParametersSelectedFields,
	});
const _ShardRecoveryStartFields = {
	epoch: bcs.u32(),
	shards: bcs.vector(bcs.u16()),
};
export const ShardRecoveryStart: MoveStruct<typeof _ShardRecoveryStartFields> = new MoveStruct({
	name: `${$moduleName}::ShardRecoveryStart`,
	fields: _ShardRecoveryStartFields,
});
const _ContractUpgradedFields = {
	epoch: bcs.u32(),
	package_id: bcs.Address,
	version: bcs.u64(),
};
export const ContractUpgraded: MoveStruct<typeof _ContractUpgradedFields> = new MoveStruct({
	name: `${$moduleName}::ContractUpgraded`,
	fields: _ContractUpgradedFields,
});
const _RegisterDenyListUpdateFields = {
	epoch: bcs.u32(),
	root: bcs.u256(),
	sequence_number: bcs.u64(),
	node_id: bcs.Address,
};
export const RegisterDenyListUpdate: MoveStruct<typeof _RegisterDenyListUpdateFields> =
	new MoveStruct({
		name: `${$moduleName}::RegisterDenyListUpdate`,
		fields: _RegisterDenyListUpdateFields,
	});
const _DenyListUpdateFields = {
	epoch: bcs.u32(),
	root: bcs.u256(),
	sequence_number: bcs.u64(),
	node_id: bcs.Address,
};
export const DenyListUpdate: MoveStruct<typeof _DenyListUpdateFields> = new MoveStruct({
	name: `${$moduleName}::DenyListUpdate`,
	fields: _DenyListUpdateFields,
});
const _DenyListBlobDeletedFields = {
	epoch: bcs.u32(),
	blob_id: bcs.u256(),
};
export const DenyListBlobDeleted: MoveStruct<typeof _DenyListBlobDeletedFields> = new MoveStruct({
	name: `${$moduleName}::DenyListBlobDeleted`,
	fields: _DenyListBlobDeletedFields,
});
const _ContractUpgradeProposedFields = {
	epoch: bcs.u32(),
	package_digest: bcs.vector(bcs.u8()),
};
export const ContractUpgradeProposed: MoveStruct<typeof _ContractUpgradeProposedFields> =
	new MoveStruct({
		name: `${$moduleName}::ContractUpgradeProposed`,
		fields: _ContractUpgradeProposedFields,
	});
const _ContractUpgradeQuorumReachedFields = {
	epoch: bcs.u32(),
	package_digest: bcs.vector(bcs.u8()),
};
export const ContractUpgradeQuorumReached: MoveStruct<typeof _ContractUpgradeQuorumReachedFields> =
	new MoveStruct({
		name: `${$moduleName}::ContractUpgradeQuorumReached`,
		fields: _ContractUpgradeQuorumReachedFields,
	});
const _ProtocolVersionUpdatedFields = {
	epoch: bcs.u32(),
	start_epoch: bcs.u32(),
	protocol_version: bcs.u64(),
};
export const ProtocolVersionUpdated: MoveStruct<typeof _ProtocolVersionUpdatedFields> =
	new MoveStruct({
		name: `${$moduleName}::ProtocolVersionUpdated`,
		fields: _ProtocolVersionUpdatedFields,
	});
const _PricesUpdatedFields = {
	epoch: bcs.u32(),
	storage_price: bcs.u64(),
	write_price: bcs.u64(),
};
export const PricesUpdated: MoveStruct<typeof _PricesUpdatedFields> = new MoveStruct({
	name: `${$moduleName}::PricesUpdated`,
	fields: _PricesUpdatedFields,
});
const _StoragePoolCreatedFields = {
	epoch: bcs.u32(),
	storage_pool_id: bcs.Address,
	reserved_encoded_capacity_bytes: bcs.u64(),
	start_epoch: bcs.u32(),
	end_epoch: bcs.u32(),
};
export const StoragePoolCreated: MoveStruct<typeof _StoragePoolCreatedFields> = new MoveStruct({
	name: `${$moduleName}::StoragePoolCreated`,
	fields: _StoragePoolCreatedFields,
});
const _PooledBlobRegisteredFields = {
	epoch: bcs.u32(),
	blob_id: bcs.u256(),
	unencoded_size: bcs.u64(),
	encoding_type: bcs.u8(),
	deletable: bcs.bool(),
	object_id: bcs.Address,
	storage_pool_id: bcs.Address,
};
export const PooledBlobRegistered: MoveStruct<typeof _PooledBlobRegisteredFields> = new MoveStruct({
	name: `${$moduleName}::PooledBlobRegistered`,
	fields: _PooledBlobRegisteredFields,
});
const _PooledBlobCertifiedFields = {
	epoch: bcs.u32(),
	blob_id: bcs.u256(),
	deletable: bcs.bool(),
	object_id: bcs.Address,
	storage_pool_id: bcs.Address,
};
export const PooledBlobCertified: MoveStruct<typeof _PooledBlobCertifiedFields> = new MoveStruct({
	name: `${$moduleName}::PooledBlobCertified`,
	fields: _PooledBlobCertifiedFields,
});
const _PooledBlobDeletedFields = {
	epoch: bcs.u32(),
	blob_id: bcs.u256(),
	object_id: bcs.Address,
	was_certified: bcs.bool(),
	storage_pool_id: bcs.Address,
};
export const PooledBlobDeleted: MoveStruct<typeof _PooledBlobDeletedFields> = new MoveStruct({
	name: `${$moduleName}::PooledBlobDeleted`,
	fields: _PooledBlobDeletedFields,
});
const _StoragePoolExtendedFields = {
	epoch: bcs.u32(),
	storage_pool_id: bcs.Address,
	new_end_epoch: bcs.u32(),
};
export const StoragePoolExtended: MoveStruct<typeof _StoragePoolExtendedFields> = new MoveStruct({
	name: `${$moduleName}::StoragePoolExtended`,
	fields: _StoragePoolExtendedFields,
});
