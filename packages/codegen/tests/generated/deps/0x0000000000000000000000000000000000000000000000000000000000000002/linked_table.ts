import { bcs, type BcsType } from "@mysten/sui/bcs";
import * as object from "./object.js";
import * as option from "../0x0000000000000000000000000000000000000000000000000000000000000001/option.js";
export function LinkedTable<T0 extends BcsType<any>>(...typeParameters: [
    T0
]) {
    return bcs.struct("LinkedTable", ({
        id: object.UID(),
        size: bcs.u64(),
        head: option.Option(typeParameters[0]),
        tail: option.Option(typeParameters[0])
    }));
}
export function Node<T0 extends BcsType<any>, T1 extends BcsType<any>>(...typeParameters: [
    T0,
    T1
]) {
    return bcs.struct("Node", ({
        prev: option.Option(typeParameters[0]),
        next: option.Option(typeParameters[0]),
        value: typeParameters[1]
    }));
}