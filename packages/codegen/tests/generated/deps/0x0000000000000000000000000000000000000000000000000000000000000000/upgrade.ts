// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import * as vec_set from "../0x0000000000000000000000000000000000000000000000000000000000000002/vec_set.js";
import * as object from "../0x0000000000000000000000000000000000000000000000000000000000000002/object.js";
import * as _package from "../0x0000000000000000000000000000000000000000000000000000000000000002/package.js";
import * as table from "../0x0000000000000000000000000000000000000000000000000000000000000002/table.js";
export function PackageDigest() {
    return bcs.struct("PackageDigest", ({
        pos0: bcs.vector(bcs.u8())
    }));
}
export function UpgradeProposal() {
    return bcs.struct("UpgradeProposal", ({
        epoch: bcs.u32(),
        digest: PackageDigest(),
        version: bcs.u64(),
        voting_weight: bcs.u16(),
        voters: vec_set.VecSet(bcs.Address)
    }));
}
export function UpgradeManager() {
    return bcs.struct("UpgradeManager", ({
        id: object.UID(),
        cap: _package.UpgradeCap(),
        upgrade_proposals: table.Table()
    }));
}
export function EmergencyUpgradeCap() {
    return bcs.struct("EmergencyUpgradeCap", ({
        id: object.UID(),
        upgrade_manager_id: bcs.Address
    }));
}