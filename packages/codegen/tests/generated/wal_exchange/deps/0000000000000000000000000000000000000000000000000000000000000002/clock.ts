import { bcs } from "@mysten/sui/bcs";
import * as object from "./../../../deps/0000000000000000000000000000000000000000000000000000000000000002/object";
export function Clock() {
    return bcs.struct("Clock", ({
        id: object.UID(),
        timestamp_ms: bcs.u64()
    }));
}