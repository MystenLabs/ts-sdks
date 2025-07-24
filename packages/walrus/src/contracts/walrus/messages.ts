// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import { MoveStruct, MoveEnum } from '../utils/index.js';
const $moduleName = '@local-pkg/walrus::messages';
export const ProofOfPossessionMessage = new MoveStruct(`${$moduleName}::ProofOfPossessionMessage`, {
	intent_type: bcs.u8(),
	intent_version: bcs.u8(),
	intent_app: bcs.u8(),
	epoch: bcs.u32(),
	sui_address: bcs.Address,
	bls_key: bcs.vector(bcs.u8()),
});
export const CertifiedMessage = new MoveStruct(`${$moduleName}::CertifiedMessage`, {
	intent_type: bcs.u8(),
	intent_version: bcs.u8(),
	cert_epoch: bcs.u32(),
	message: bcs.vector(bcs.u8()),
	stake_support: bcs.u16(),
});
/** The persistence type of a blob. Used for storage confirmation. */
export const BlobPersistenceType = new MoveEnum(`${$moduleName}::BlobPersistenceType`, {
	Permanent: null,
	Deletable: new MoveStruct(`BlobPersistenceType.Deletable`, {
		object_id: bcs.Address,
	}),
});
export const CertifiedBlobMessage = new MoveStruct(`${$moduleName}::CertifiedBlobMessage`, {
	blob_id: bcs.u256(),
	blob_persistence_type: BlobPersistenceType,
});
export const CertifiedInvalidBlobId = new MoveStruct(`${$moduleName}::CertifiedInvalidBlobId`, {
	blob_id: bcs.u256(),
});
export const DenyListUpdateMessage = new MoveStruct(`${$moduleName}::DenyListUpdateMessage`, {
	storage_node_id: bcs.Address,
	deny_list_sequence_number: bcs.u64(),
	deny_list_size: bcs.u64(),
	deny_list_root: bcs.u256(),
});
export const DenyListBlobDeleted = new MoveStruct(`${$moduleName}::DenyListBlobDeleted`, {
	blob_id: bcs.u256(),
});
