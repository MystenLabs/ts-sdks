import { bcs } from "@mysten/sui/bcs";
import * as table from "./table.js";
export function TableVec() {
    return bcs.struct("TableVec", ({
        contents: table.Table()
    }));
}