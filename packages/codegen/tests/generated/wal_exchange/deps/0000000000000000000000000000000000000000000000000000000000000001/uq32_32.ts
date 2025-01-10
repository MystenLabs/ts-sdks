import { bcs } from "@mysten/sui/bcs";
export function UQ32_32() {
    return bcs.struct("UQ32_32", ({
        pos0: bcs.u64()
    }));
}