// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
export function PoolExchangeRate() {
    return bcs.enum("PoolExchangeRate", ({
        Flat: null,
        Variable: bcs.tuple([bcs.u128(), bcs.u128()])
    }));
}