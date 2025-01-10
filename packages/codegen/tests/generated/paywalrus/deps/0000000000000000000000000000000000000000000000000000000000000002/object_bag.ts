import { bcs } from "@mysten/sui/bcs";
import * as object from "./../../../deps/0000000000000000000000000000000000000000000000000000000000000002/object";
export function ObjectBag() {
    return bcs.struct("ObjectBag", ({
        id: object.UID(),
        size: bcs.u64()
    }));
}