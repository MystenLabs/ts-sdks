import { bcs } from "@mysten/sui/bcs";
import * as object from "./../../../deps/0000000000000000000000000000000000000000000000000000000000000002/object";
export function Versioned() {
    return bcs.struct("Versioned", ({
        id: object.UID(),
        version: bcs.u64()
    }));
}
export function VersionChangeCap() {
    return bcs.struct("VersionChangeCap", ({
        versioned_id: bcs.Address,
        old_version: bcs.u64()
    }));
}