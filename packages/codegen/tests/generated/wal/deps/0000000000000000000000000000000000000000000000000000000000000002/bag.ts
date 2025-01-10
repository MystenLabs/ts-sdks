import { bcs } from "@mysten/sui/bcs";
import * as object from "./../../../deps/0000000000000000000000000000000000000000000000000000000000000002/object";
export function Bag() {
    return bcs.struct("Bag", ({
        id: object.UID(),
        size: bcs.u64()
    }));
}