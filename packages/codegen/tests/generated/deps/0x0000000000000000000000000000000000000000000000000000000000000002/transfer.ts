import { bcs } from "@mysten/sui/bcs";
import * as object from "./object.js";
export function Receiving() {
    return bcs.struct("Receiving", ({
        id: object.ID(),
        version: bcs.u64()
    }));
}