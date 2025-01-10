import { bcs } from "@mysten/sui/bcs";
import * as object from "./../../../deps/0000000000000000000000000000000000000000000000000000000000000002/object";
export function ObjectTable() {
    return bcs.struct("ObjectTable", ({
        id: object.UID(),
        size: bcs.u64()
    }));
}