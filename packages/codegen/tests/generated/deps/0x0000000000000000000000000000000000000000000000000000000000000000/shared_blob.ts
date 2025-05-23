// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import * as object from "../0x0000000000000000000000000000000000000000000000000000000000000002/object.js";
import * as blob from "../../blob.js";
import * as balance from "../0x0000000000000000000000000000000000000000000000000000000000000002/balance.js";
export function SharedBlob() {
    return bcs.struct("SharedBlob", ({
        id: object.UID(),
        blob: blob.Blob(),
        funds: balance.Balance()
    }));
}