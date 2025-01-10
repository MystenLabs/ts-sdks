import { bcs } from "@mysten/sui/bcs";
export function WAL() {
    return bcs.struct("WAL", ({
        dummy_field: bcs.bool()
    }));
}