import { bcs, type BcsType } from "@mysten/sui/bcs";
import * as option from "../0x0000000000000000000000000000000000000000000000000000000000000001/option.js";
import * as object from "./object.js";
export function Referent<T0 extends BcsType<any>>(...typeParameters: [
    T0
]) {
    return bcs.struct("Referent", ({
        id: bcs.Address,
        value: option.Option(typeParameters[0])
    }));
}
export function Borrow() {
    return bcs.struct("Borrow", ({
        ref: bcs.Address,
        obj: object.ID()
    }));
}