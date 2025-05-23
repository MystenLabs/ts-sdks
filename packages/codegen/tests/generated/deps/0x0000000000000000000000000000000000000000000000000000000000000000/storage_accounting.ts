// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import * as balance from "../0x0000000000000000000000000000000000000000000000000000000000000002/balance.js";
export function FutureAccounting() {
    return bcs.struct("FutureAccounting", ({
        epoch: bcs.u32(),
        used_capacity: bcs.u64(),
        rewards_to_distribute: balance.Balance()
    }));
}
export function FutureAccountingRingBuffer() {
    return bcs.struct("FutureAccountingRingBuffer", ({
        current_index: bcs.u32(),
        length: bcs.u32(),
        ring_buffer: bcs.vector(FutureAccounting())
    }));
}