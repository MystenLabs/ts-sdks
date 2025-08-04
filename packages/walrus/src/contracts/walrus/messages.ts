// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MoveStruct, MoveEnum } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/walrus::messages';
export const ProofOfPossessionMessage = new MoveStruct({
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
export const CertifiedMessage = new MoveStruct({
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
export const BlobPersistenceType = new MoveEnum({
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
export const CertifiedBlobMessage = new MoveStruct({
	name: `${$moduleName}::CertifiedBlobMessage`,
	fields: {
		blob_id: bcs.u256(),
		blob_persistence_type: BlobPersistenceType,
	},
});
export const CertifiedInvalidBlobId = new MoveStruct({
	name: `${$moduleName}::CertifiedInvalidBlobId`,
	fields: {
		blob_id: bcs.u256(),
	},
});
export const ProtocolVersionMessage = new MoveStruct({
	name: `${$moduleName}::ProtocolVersionMessage`,
	fields: {
		start_epoch: bcs.u32(),
		protocol_version: bcs.u64(),
	},
});
export const DenyListUpdateMessage = new MoveStruct({
	name: `${$moduleName}::DenyListUpdateMessage`,
	fields: {
		storage_node_id: bcs.Address,
		deny_list_sequence_number: bcs.u64(),
		deny_list_size: bcs.u64(),
		deny_list_root: bcs.u256(),
	},
});
export const DenyListBlobDeleted = new MoveStruct({
	name: `${$moduleName}::DenyListBlobDeleted`,
	fields: {
		blob_id: bcs.u256(),
	},
});
