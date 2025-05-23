// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import * as group_ops from "../0x0000000000000000000000000000000000000000000000000000000000000002/group_ops.js";
import * as extended_field from "../../extended_field.js";
import * as object from "../0x0000000000000000000000000000000000000000000000000000000000000002/object.js";
import * as event_blob from "../../event_blob.js";
export function StorageNodeInfo() {
    return bcs.struct("StorageNodeInfo", ({
        name: bcs.string(),
        node_id: bcs.Address,
        network_address: bcs.string(),
        public_key: group_ops.Element(),
        next_epoch_public_key: bcs.option(group_ops.Element()),
        network_public_key: bcs.vector(bcs.u8()),
        metadata: extended_field.ExtendedField()
    }));
}
export function StorageNodeCap() {
    return bcs.struct("StorageNodeCap", ({
        id: object.UID(),
        node_id: bcs.Address,
        last_epoch_sync_done: bcs.u32(),
        last_event_blob_attestation: bcs.option(event_blob.EventBlobAttestation()),
        deny_list_root: bcs.u256(),
        deny_list_sequence: bcs.u64(),
        deny_list_size: bcs.u64()
    }));
}