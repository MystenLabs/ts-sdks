// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import * as vec_map from "../0x0000000000000000000000000000000000000000000000000000000000000002/vec_map.js";
export function EventBlobAttestation() {
    return bcs.struct("EventBlobAttestation", ({
        checkpoint_sequence_num: bcs.u64(),
        epoch: bcs.u32()
    }));
}
export function EventBlob() {
    return bcs.struct("EventBlob", ({
        blob_id: bcs.u256(),
        ending_checkpoint_sequence_number: bcs.u64()
    }));
}
export function EventBlobCertificationState() {
    return bcs.struct("EventBlobCertificationState", ({
        latest_certified_blob: bcs.option(EventBlob()),
        aggregate_weight_per_blob: vec_map.VecMap(EventBlob(), bcs.u16())
    }));
}