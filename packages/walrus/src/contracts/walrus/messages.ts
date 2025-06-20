// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
export function ProofOfPossessionMessage() {
	return bcs.struct('ProofOfPossessionMessage', {
		intent_type: bcs.u8(),
		intent_version: bcs.u8(),
		intent_app: bcs.u8(),
		epoch: bcs.u32(),
		sui_address: bcs.Address,
		bls_key: bcs.vector(bcs.u8()),
	});
}
export function CertifiedMessage() {
	return bcs.struct('CertifiedMessage', {
		intent_type: bcs.u8(),
		intent_version: bcs.u8(),
		cert_epoch: bcs.u32(),
		message: bcs.vector(bcs.u8()),
		stake_support: bcs.u16(),
	});
}
export function CertifiedBlobMessage() {
	return bcs.struct('CertifiedBlobMessage', {
		blob_id: bcs.u256(),
		blob_persistence_type: BlobPersistenceType(),
	});
}
export function CertifiedInvalidBlobId() {
	return bcs.struct('CertifiedInvalidBlobId', {
		blob_id: bcs.u256(),
	});
}
export function DenyListUpdateMessage() {
	return bcs.struct('DenyListUpdateMessage', {
		storage_node_id: bcs.Address,
		deny_list_sequence_number: bcs.u64(),
		deny_list_size: bcs.u64(),
		deny_list_root: bcs.u256(),
	});
}
export function DenyListBlobDeleted() {
	return bcs.struct('DenyListBlobDeleted', {
		blob_id: bcs.u256(),
	});
}
/** The persistence type of a blob. Used for storage confirmation. */
export function BlobPersistenceType() {
	return bcs.enum('BlobPersistenceType', {
		Permanent: null,
		Deletable: bcs.struct('BlobPersistenceType.Deletable', {
			object_id: bcs.Address,
		}),
	});
}
