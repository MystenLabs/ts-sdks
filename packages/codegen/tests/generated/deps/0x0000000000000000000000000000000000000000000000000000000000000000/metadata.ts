// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import * as vec_map from "../0x0000000000000000000000000000000000000000000000000000000000000002/vec_map.js";
export function Metadata() {
    return bcs.struct("Metadata", ({
        metadata: vec_map.VecMap(bcs.string(), bcs.string())
    }));
}