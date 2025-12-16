/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module to certify event blobs. */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@local-pkg/walrus::event_blob';
export const EventBlobAttestation = new MoveStruct({
	name: `${$moduleName}::EventBlobAttestation`,
	fields: {
		checkpoint_sequence_num: bcs.u64(),
		epoch: bcs.u32(),
	},
});
export const EventBlob = new MoveStruct({
	name: `${$moduleName}::EventBlob`,
	fields: {
		/** Blob id of the certified event blob. */
		blob_id: bcs.u256(),
		/** Ending sui checkpoint of the certified event blob. */
		ending_checkpoint_sequence_number: bcs.u64(),
	},
});
export const EventBlobCertificationState = new MoveStruct({
	name: `${$moduleName}::EventBlobCertificationState`,
	fields: {
		/** Latest certified event blob. */
		latest_certified_blob: bcs.option(EventBlob),
		/** Current event blob being attested. */
		aggregate_weight_per_blob: vec_map.VecMap(EventBlob, bcs.u16()),
	},
});
