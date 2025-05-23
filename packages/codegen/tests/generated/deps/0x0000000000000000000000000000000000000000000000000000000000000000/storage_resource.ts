// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import * as object from "../0x0000000000000000000000000000000000000000000000000000000000000002/object.js";
export function Storage() {
    return bcs.struct("Storage", ({
        id: object.UID(),
        start_epoch: bcs.u32(),
        end_epoch: bcs.u32(),
        storage_size: bcs.u64()
    }));
}