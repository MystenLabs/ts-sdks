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
export const BlobRegistered: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	blob_id: ReturnType<typeof bcs.u256>;
	size: ReturnType<typeof bcs.u64>;
	encoding_type: ReturnType<typeof bcs.u8>;
	end_epoch: ReturnType<typeof bcs.u32>;
	deletable: ReturnType<typeof bcs.bool>;
	object_id: typeof bcs.Address;
}> = new MoveStruct({
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
export const BlobCertified: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	blob_id: ReturnType<typeof bcs.u256>;
	end_epoch: ReturnType<typeof bcs.u32>;
	deletable: ReturnType<typeof bcs.bool>;
	object_id: typeof bcs.Address;
	is_extension: ReturnType<typeof bcs.bool>;
}> = new MoveStruct({
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
export const BlobDeleted: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	blob_id: ReturnType<typeof bcs.u256>;
	end_epoch: ReturnType<typeof bcs.u32>;
	object_id: typeof bcs.Address;
	was_certified: ReturnType<typeof bcs.bool>;
}> = new MoveStruct({
	name: `${$moduleName}::BlobDeleted`,
	fields: {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
		end_epoch: bcs.u32(),
		object_id: bcs.Address,
		was_certified: bcs.bool(),
	},
});
export const InvalidBlobID: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	blob_id: ReturnType<typeof bcs.u256>;
}> = new MoveStruct({
	name: `${$moduleName}::InvalidBlobID`,
	fields: {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
	},
});
export const EpochChangeStart: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
}> = new MoveStruct({
	name: `${$moduleName}::EpochChangeStart`,
	fields: {
		epoch: bcs.u32(),
	},
});
export const EpochChangeDone: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
}> = new MoveStruct({
	name: `${$moduleName}::EpochChangeDone`,
	fields: {
		epoch: bcs.u32(),
	},
});
export const ShardsReceived: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	shards: ReturnType<typeof bcs.vector<ReturnType<typeof bcs.u16>>>;
}> = new MoveStruct({
	name: `${$moduleName}::ShardsReceived`,
	fields: {
		epoch: bcs.u32(),
		shards: bcs.vector(bcs.u16()),
	},
});
export const EpochParametersSelected: MoveStruct<{
	next_epoch: ReturnType<typeof bcs.u32>;
}> = new MoveStruct({
	name: `${$moduleName}::EpochParametersSelected`,
	fields: {
		next_epoch: bcs.u32(),
	},
});
export const ShardRecoveryStart: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	shards: ReturnType<typeof bcs.vector<ReturnType<typeof bcs.u16>>>;
}> = new MoveStruct({
	name: `${$moduleName}::ShardRecoveryStart`,
	fields: {
		epoch: bcs.u32(),
		shards: bcs.vector(bcs.u16()),
	},
});
export const ContractUpgraded: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	package_id: typeof bcs.Address;
	version: ReturnType<typeof bcs.u64>;
}> = new MoveStruct({
	name: `${$moduleName}::ContractUpgraded`,
	fields: {
		epoch: bcs.u32(),
		package_id: bcs.Address,
		version: bcs.u64(),
	},
});
export const RegisterDenyListUpdate: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	root: ReturnType<typeof bcs.u256>;
	sequence_number: ReturnType<typeof bcs.u64>;
	node_id: typeof bcs.Address;
}> = new MoveStruct({
	name: `${$moduleName}::RegisterDenyListUpdate`,
	fields: {
		epoch: bcs.u32(),
		root: bcs.u256(),
		sequence_number: bcs.u64(),
		node_id: bcs.Address,
	},
});
export const DenyListUpdate: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	root: ReturnType<typeof bcs.u256>;
	sequence_number: ReturnType<typeof bcs.u64>;
	node_id: typeof bcs.Address;
}> = new MoveStruct({
	name: `${$moduleName}::DenyListUpdate`,
	fields: {
		epoch: bcs.u32(),
		root: bcs.u256(),
		sequence_number: bcs.u64(),
		node_id: bcs.Address,
	},
});
export const DenyListBlobDeleted: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	blob_id: ReturnType<typeof bcs.u256>;
}> = new MoveStruct({
	name: `${$moduleName}::DenyListBlobDeleted`,
	fields: {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
	},
});
export const ContractUpgradeProposed: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	package_digest: ReturnType<typeof bcs.vector<ReturnType<typeof bcs.u8>>>;
}> = new MoveStruct({
	name: `${$moduleName}::ContractUpgradeProposed`,
	fields: {
		epoch: bcs.u32(),
		package_digest: bcs.vector(bcs.u8()),
	},
});
export const ContractUpgradeQuorumReached: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	package_digest: ReturnType<typeof bcs.vector<ReturnType<typeof bcs.u8>>>;
}> = new MoveStruct({
	name: `${$moduleName}::ContractUpgradeQuorumReached`,
	fields: {
		epoch: bcs.u32(),
		package_digest: bcs.vector(bcs.u8()),
	},
});
export const ProtocolVersionUpdated: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	start_epoch: ReturnType<typeof bcs.u32>;
	protocol_version: ReturnType<typeof bcs.u64>;
}> = new MoveStruct({
	name: `${$moduleName}::ProtocolVersionUpdated`,
	fields: {
		epoch: bcs.u32(),
		start_epoch: bcs.u32(),
		protocol_version: bcs.u64(),
	},
});
export const PricesUpdated: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	storage_price: ReturnType<typeof bcs.u64>;
	write_price: ReturnType<typeof bcs.u64>;
}> = new MoveStruct({
	name: `${$moduleName}::PricesUpdated`,
	fields: {
		epoch: bcs.u32(),
		storage_price: bcs.u64(),
		write_price: bcs.u64(),
	},
});
export const StoragePoolCreated: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	storage_pool_id: typeof bcs.Address;
	reserved_encoded_capacity_bytes: ReturnType<typeof bcs.u64>;
	start_epoch: ReturnType<typeof bcs.u32>;
	end_epoch: ReturnType<typeof bcs.u32>;
}> = new MoveStruct({
	name: `${$moduleName}::StoragePoolCreated`,
	fields: {
		epoch: bcs.u32(),
		storage_pool_id: bcs.Address,
		reserved_encoded_capacity_bytes: bcs.u64(),
		start_epoch: bcs.u32(),
		end_epoch: bcs.u32(),
	},
});
export const PooledBlobRegistered: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	blob_id: ReturnType<typeof bcs.u256>;
	unencoded_size: ReturnType<typeof bcs.u64>;
	encoding_type: ReturnType<typeof bcs.u8>;
	deletable: ReturnType<typeof bcs.bool>;
	object_id: typeof bcs.Address;
	storage_pool_id: typeof bcs.Address;
}> = new MoveStruct({
	name: `${$moduleName}::PooledBlobRegistered`,
	fields: {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
		unencoded_size: bcs.u64(),
		encoding_type: bcs.u8(),
		deletable: bcs.bool(),
		object_id: bcs.Address,
		storage_pool_id: bcs.Address,
	},
});
export const PooledBlobCertified: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	blob_id: ReturnType<typeof bcs.u256>;
	deletable: ReturnType<typeof bcs.bool>;
	object_id: typeof bcs.Address;
	storage_pool_id: typeof bcs.Address;
}> = new MoveStruct({
	name: `${$moduleName}::PooledBlobCertified`,
	fields: {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
		deletable: bcs.bool(),
		object_id: bcs.Address,
		storage_pool_id: bcs.Address,
	},
});
export const PooledBlobDeleted: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	blob_id: ReturnType<typeof bcs.u256>;
	object_id: typeof bcs.Address;
	was_certified: ReturnType<typeof bcs.bool>;
	storage_pool_id: typeof bcs.Address;
}> = new MoveStruct({
	name: `${$moduleName}::PooledBlobDeleted`,
	fields: {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
		object_id: bcs.Address,
		was_certified: bcs.bool(),
		storage_pool_id: bcs.Address,
	},
});
export const StoragePoolExtended: MoveStruct<{
	epoch: ReturnType<typeof bcs.u32>;
	storage_pool_id: typeof bcs.Address;
	new_end_epoch: ReturnType<typeof bcs.u32>;
}> = new MoveStruct({
	name: `${$moduleName}::StoragePoolExtended`,
	fields: {
		epoch: bcs.u32(),
		storage_pool_id: bcs.Address,
		new_end_epoch: bcs.u32(),
	},
});
