// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import * as vec_map from "../0x0000000000000000000000000000000000000000000000000000000000000002/vec_map.js";
export function NodeMetadata() {
    return bcs.struct("NodeMetadata", ({
        image_url: bcs.string(),
        project_url: bcs.string(),
        description: bcs.string(),
        extra_fields: vec_map.VecMap(bcs.string(), bcs.string())
    }));
}