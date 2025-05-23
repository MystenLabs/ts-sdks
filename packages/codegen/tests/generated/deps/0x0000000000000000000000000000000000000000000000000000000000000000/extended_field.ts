// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import * as object from "../0x0000000000000000000000000000000000000000000000000000000000000002/object.js";
export function ExtendedField() {
    return bcs.struct("ExtendedField", ({
        id: object.UID()
    }));
}
export function Key() {
    return bcs.struct("Key", ({
        dummy_field: bcs.bool()
    }));
}