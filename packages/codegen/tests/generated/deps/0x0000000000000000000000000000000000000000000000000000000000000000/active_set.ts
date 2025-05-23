// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
export function ActiveSetEntry() {
    return bcs.struct("ActiveSetEntry", ({
        node_id: bcs.Address,
        staked_amount: bcs.u64()
    }));
}
export function ActiveSet() {
    return bcs.struct("ActiveSet", ({
        max_size: bcs.u16(),
        threshold_stake: bcs.u64(),
        nodes: bcs.vector(ActiveSetEntry()),
        total_stake: bcs.u64()
    }));
}