// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import * as object from "../0x0000000000000000000000000000000000000000000000000000000000000002/object.js";
import * as object_bag from "../0x0000000000000000000000000000000000000000000000000000000000000002/object_bag.js";
export function ObjectDisplay() {
    return bcs.struct("ObjectDisplay", ({
        id: object.UID(),
        inner: object_bag.ObjectBag()
    }));
}
export function PublisherKey() {
    return bcs.struct("PublisherKey", ({
        dummy_field: bcs.bool()
    }));
}