/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, MoveEnum } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/walrus::messages';
export const ProofOfPossessionMessage: MoveStruct<{
	intent_type: ReturnType<typeof bcs.u8>;
	intent_version: ReturnType<typeof bcs.u8>;
	intent_app: ReturnType<typeof bcs.u8>;
	epoch: ReturnType<typeof bcs.u32>;
	sui_address: typeof bcs.Address;
	bls_key: ReturnType<typeof bcs.vector<ReturnType<typeof bcs.u8>>>;
}> = new MoveStruct({
	name: `${$moduleName}::ProofOfPossessionMessage`,
	fields: {
		intent_type: bcs.u8(),
		intent_version: bcs.u8(),
		intent_app: bcs.u8(),
		epoch: bcs.u32(),
		sui_address: bcs.Address,
		bls_key: bcs.vector(bcs.u8()),
	},
});
export const CertifiedMessage: MoveStruct<{
	intent_type: ReturnType<typeof bcs.u8>;
	intent_version: ReturnType<typeof bcs.u8>;
	cert_epoch: ReturnType<typeof bcs.u32>;
	message: ReturnType<typeof bcs.vector<ReturnType<typeof bcs.u8>>>;
	stake_support: ReturnType<typeof bcs.u16>;
}> = new MoveStruct({
	name: `${$moduleName}::CertifiedMessage`,
	fields: {
		intent_type: bcs.u8(),
		intent_version: bcs.u8(),
		cert_epoch: bcs.u32(),
		message: bcs.vector(bcs.u8()),
		stake_support: bcs.u16(),
	},
});
/** The persistence type of a blob. Used for storage confirmation. */
export const BlobPersistenceType: MoveEnum<{
	Permanent: null;
	Deletable: MoveStruct<{
		object_id: typeof bcs.Address;
	}>;
}> = new MoveEnum({
	name: `${$moduleName}::BlobPersistenceType`,
	fields: {
		Permanent: null,
		Deletable: new MoveStruct({
			name: `BlobPersistenceType.Deletable`,
			fields: {
				object_id: bcs.Address,
			},
		}),
	},
});
export const CertifiedBlobMessage: MoveStruct<{
	blob_id: ReturnType<typeof bcs.u256>;
	blob_persistence_type: typeof BlobPersistenceType;
}> = new MoveStruct({
	name: `${$moduleName}::CertifiedBlobMessage`,
	fields: {
		blob_id: bcs.u256(),
		blob_persistence_type: BlobPersistenceType,
	},
});
export const CertifiedInvalidBlobId: MoveStruct<{
	blob_id: ReturnType<typeof bcs.u256>;
}> = new MoveStruct({
	name: `${$moduleName}::CertifiedInvalidBlobId`,
	fields: {
		blob_id: bcs.u256(),
	},
});
export const ProtocolVersionMessage: MoveStruct<{
	start_epoch: ReturnType<typeof bcs.u32>;
	protocol_version: ReturnType<typeof bcs.u64>;
}> = new MoveStruct({
	name: `${$moduleName}::ProtocolVersionMessage`,
	fields: {
		start_epoch: bcs.u32(),
		protocol_version: bcs.u64(),
	},
});
export const DenyListUpdateMessage: MoveStruct<{
	storage_node_id: typeof bcs.Address;
	deny_list_sequence_number: ReturnType<typeof bcs.u64>;
	deny_list_size: ReturnType<typeof bcs.u64>;
	deny_list_root: ReturnType<typeof bcs.u256>;
}> = new MoveStruct({
	name: `${$moduleName}::DenyListUpdateMessage`,
	fields: {
		storage_node_id: bcs.Address,
		deny_list_sequence_number: bcs.u64(),
		deny_list_size: bcs.u64(),
		deny_list_root: bcs.u256(),
	},
});
export const DenyListBlobDeleted: MoveStruct<{
	blob_id: ReturnType<typeof bcs.u256>;
}> = new MoveStruct({
	name: `${$moduleName}::DenyListBlobDeleted`,
	fields: {
		blob_id: bcs.u256(),
	},
});
