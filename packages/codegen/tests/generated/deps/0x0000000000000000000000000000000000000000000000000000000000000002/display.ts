import { bcs } from "@mysten/sui/bcs";
import * as object from "./object.js";
import * as vec_map from "./vec_map.js";
import * as string from "../0x0000000000000000000000000000000000000000000000000000000000000001/string.js";
export function Display() {
    return bcs.struct("Display", ({
        id: object.UID(),
        fields: vec_map.VecMap(string.String(), string.String()),
        version: bcs.u16()
    }));
}
export function DisplayCreated() {
    return bcs.struct("DisplayCreated", ({
        id: object.ID()
    }));
}
export function VersionUpdated() {
    return bcs.struct("VersionUpdated", ({
        id: object.ID(),
        version: bcs.u16(),
        fields: vec_map.VecMap(string.String(), string.String())
    }));
}