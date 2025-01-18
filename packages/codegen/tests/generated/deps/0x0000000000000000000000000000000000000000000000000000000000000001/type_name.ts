import { bcs } from "@mysten/sui/bcs";
import * as ascii from "./ascii.js";
export function TypeName() {
    return bcs.struct("TypeName", ({
        name: ascii.String()
    }));
}