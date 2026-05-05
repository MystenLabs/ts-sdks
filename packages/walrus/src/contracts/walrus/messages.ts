/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, MoveEnum } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/walrus::messages';
const _ProofOfPossessionMessageFields = {
	intent_type: bcs.u8(),
	intent_version: bcs.u8(),
	intent_app: bcs.u8(),
	epoch: bcs.u32(),
	sui_address: bcs.Address,
	bls_key: bcs.vector(bcs.u8()),
};
export const ProofOfPossessionMessage: MoveStruct<typeof _ProofOfPossessionMessageFields> =
	new MoveStruct({
		name: `${$moduleName}::ProofOfPossessionMessage`,
		fields: _ProofOfPossessionMessageFields,
	});
const _CertifiedMessageFields = {
	intent_type: bcs.u8(),
	intent_version: bcs.u8(),
	cert_epoch: bcs.u32(),
	message: bcs.vector(bcs.u8()),
	stake_support: bcs.u16(),
};
export const CertifiedMessage: MoveStruct<typeof _CertifiedMessageFields> = new MoveStruct({
	name: `${$moduleName}::CertifiedMessage`,
	fields: _CertifiedMessageFields,
});
const _BlobPersistenceTypeFields = {
	Permanent: null,
	Deletable: new MoveStruct({
		name: `BlobPersistenceType.Deletable`,
		fields: {
			object_id: bcs.Address,
		},
	}),
};
/** The persistence type of a blob. Used for storage confirmation. */
export const BlobPersistenceType: MoveEnum<typeof _BlobPersistenceTypeFields> = new MoveEnum({
	name: `${$moduleName}::BlobPersistenceType`,
	fields: _BlobPersistenceTypeFields,
});
const _CertifiedBlobMessageFields = {
	blob_id: bcs.u256(),
	blob_persistence_type: BlobPersistenceType,
};
export const CertifiedBlobMessage: MoveStruct<typeof _CertifiedBlobMessageFields> = new MoveStruct({
	name: `${$moduleName}::CertifiedBlobMessage`,
	fields: _CertifiedBlobMessageFields,
});
const _CertifiedInvalidBlobIdFields = {
	blob_id: bcs.u256(),
};
export const CertifiedInvalidBlobId: MoveStruct<typeof _CertifiedInvalidBlobIdFields> =
	new MoveStruct({
		name: `${$moduleName}::CertifiedInvalidBlobId`,
		fields: _CertifiedInvalidBlobIdFields,
	});
const _ProtocolVersionMessageFields = {
	start_epoch: bcs.u32(),
	protocol_version: bcs.u64(),
};
export const ProtocolVersionMessage: MoveStruct<typeof _ProtocolVersionMessageFields> =
	new MoveStruct({
		name: `${$moduleName}::ProtocolVersionMessage`,
		fields: _ProtocolVersionMessageFields,
	});
const _DenyListUpdateMessageFields = {
	storage_node_id: bcs.Address,
	deny_list_sequence_number: bcs.u64(),
	deny_list_size: bcs.u64(),
	deny_list_root: bcs.u256(),
};
export const DenyListUpdateMessage: MoveStruct<typeof _DenyListUpdateMessageFields> =
	new MoveStruct({
		name: `${$moduleName}::DenyListUpdateMessage`,
		fields: _DenyListUpdateMessageFields,
	});
const _DenyListBlobDeletedFields = {
	blob_id: bcs.u256(),
};
export const DenyListBlobDeleted: MoveStruct<typeof _DenyListBlobDeletedFields> = new MoveStruct({
	name: `${$moduleName}::DenyListBlobDeleted`,
	fields: _DenyListBlobDeletedFields,
});
