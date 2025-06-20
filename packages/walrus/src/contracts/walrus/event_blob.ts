// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Module to certify event blobs. */

import { bcs } from '@mysten/sui/bcs';
import * as vec_map from './deps/sui/vec_map.js';
export function EventBlobAttestation() {
	return bcs.struct('EventBlobAttestation', {
		checkpoint_sequence_num: bcs.u64(),
		epoch: bcs.u32(),
	});
}
export function EventBlob() {
	return bcs.struct('EventBlob', {
		/** Blob id of the certified event blob. */
		blob_id: bcs.u256(),
		/** Ending sui checkpoint of the certified event blob. */
		ending_checkpoint_sequence_number: bcs.u64(),
	});
}
export function EventBlobCertificationState() {
	return bcs.struct('EventBlobCertificationState', {
		/** Latest certified event blob. */
		latest_certified_blob: bcs.option(EventBlob()),
		/** Current event blob being attested. */
		aggregate_weight_per_blob: vec_map.VecMap(EventBlob(), bcs.u16()),
	});
}
