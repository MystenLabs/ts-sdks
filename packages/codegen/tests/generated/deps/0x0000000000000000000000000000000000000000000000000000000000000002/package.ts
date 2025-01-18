import { bcs } from "@mysten/sui/bcs";
import * as object from "./object.js";
import * as ascii from "../0x0000000000000000000000000000000000000000000000000000000000000001/ascii.js";
export function Publisher() {
    return bcs.struct("Publisher", ({
        id: object.UID(),
        package: ascii.String(),
        module_name: ascii.String()
    }));
}
export function UpgradeCap() {
    return bcs.struct("UpgradeCap", ({
        id: object.UID(),
        package: object.ID(),
        version: bcs.u64(),
        policy: bcs.u8()
    }));
}
export function UpgradeTicket() {
    return bcs.struct("UpgradeTicket", ({
        cap: object.ID(),
        package: object.ID(),
        policy: bcs.u8(),
        digest: bcs.vector(bcs.u8())
    }));
}
export function UpgradeReceipt() {
    return bcs.struct("UpgradeReceipt", ({
        cap: object.ID(),
        package: object.ID()
    }));
}