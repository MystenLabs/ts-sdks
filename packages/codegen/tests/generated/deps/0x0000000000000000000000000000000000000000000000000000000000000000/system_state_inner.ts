// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import * as bls_aggregate from "../../bls_aggregate.js";
import * as storage_accounting from "../../storage_accounting.js";
import * as event_blob from "../../event_blob.js";
import * as extended_field from "../../extended_field.js";
export function SystemStateInnerV1() {
    return bcs.struct("SystemStateInnerV1", ({
        committee: bls_aggregate.BlsCommittee(),
        total_capacity_size: bcs.u64(),
        used_capacity_size: bcs.u64(),
        storage_price_per_unit_size: bcs.u64(),
        write_price_per_unit_size: bcs.u64(),
        future_accounting: storage_accounting.FutureAccountingRingBuffer(),
        event_blob_certification_state: event_blob.EventBlobCertificationState(),
        deny_list_sizes: extended_field.ExtendedField()
    }));
}