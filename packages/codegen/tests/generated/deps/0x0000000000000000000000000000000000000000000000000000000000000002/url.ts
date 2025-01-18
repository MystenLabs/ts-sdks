import { bcs } from "@mysten/sui/bcs";
import * as ascii from "../0x0000000000000000000000000000000000000000000000000000000000000001/ascii.js";
export function Url() {
    return bcs.struct("Url", ({
        url: ascii.String()
    }));
}