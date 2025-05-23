// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import * as object from "../0x0000000000000000000000000000000000000000000000000000000000000002/object.js";
export function System() {
    return bcs.struct("System", ({
        id: object.UID(),
        version: bcs.u64(),
        package_id: bcs.Address,
        new_package_id: bcs.option(bcs.Address)
    }));
}