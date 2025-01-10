import { bcs } from "@mysten/sui/bcs";
import * as object from "./../../../deps/0000000000000000000000000000000000000000000000000000000000000002/object";
export function Table() {
    return bcs.struct("Table", ({
        id: object.UID(),
        size: bcs.u64()
    }));
}