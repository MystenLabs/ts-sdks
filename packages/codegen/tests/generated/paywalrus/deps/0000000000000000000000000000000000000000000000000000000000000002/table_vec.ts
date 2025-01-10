import { bcs } from "@mysten/sui/bcs";
import * as table from "./../../../deps/0000000000000000000000000000000000000000000000000000000000000002/table";
export function TableVec() {
    return bcs.struct("TableVec", ({
        contents: table.Table()
    }));
}