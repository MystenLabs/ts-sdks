/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module to certify event blobs. */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@local-pkg/walrus::event_blob';
const _EventBlobAttestationFields = {
	checkpoint_sequence_num: bcs.u64(),
	epoch: bcs.u32(),
};
export const EventBlobAttestation: MoveStruct<typeof _EventBlobAttestationFields> = new MoveStruct({
	name: `${$moduleName}::EventBlobAttestation`,
	fields: _EventBlobAttestationFields,
});
const _EventBlobFields = {
	/** Blob id of the certified event blob. */
	blob_id: bcs.u256(),
	/** Ending sui checkpoint of the certified event blob. */
	ending_checkpoint_sequence_number: bcs.u64(),
};
export const EventBlob: MoveStruct<typeof _EventBlobFields> = new MoveStruct({
	name: `${$moduleName}::EventBlob`,
	fields: _EventBlobFields,
});
const _EventBlobCertificationStateFields = {
	/** Latest certified event blob. */
	latest_certified_blob: bcs.option(EventBlob),
	/** Current event blob being attested. */
	aggregate_weight_per_blob: vec_map.VecMap(EventBlob, bcs.u16()),
};
export const EventBlobCertificationState: MoveStruct<typeof _EventBlobCertificationStateFields> =
	new MoveStruct({
		name: `${$moduleName}::EventBlobCertificationState`,
		fields: _EventBlobCertificationStateFields,
	});
