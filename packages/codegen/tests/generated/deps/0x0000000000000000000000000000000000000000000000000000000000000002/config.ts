import { bcs, type BcsType } from "@mysten/sui/bcs";
import * as object from "./object.js";
import * as option from "../0x0000000000000000000000000000000000000000000000000000000000000001/option.js";
export function Config() {
    return bcs.struct("Config", ({
        id: object.UID()
    }));
}
export function Setting<T0 extends BcsType<any>>(...typeParameters: [
    T0
]) {
    return bcs.struct("Setting", ({
        data: option.Option(SettingData(typeParameters[0]))
    }));
}
export function SettingData<T0 extends BcsType<any>>(...typeParameters: [
    T0
]) {
    return bcs.struct("SettingData", ({
        newer_value_epoch: bcs.u64(),
        newer_value: option.Option(typeParameters[0]),
        older_value_opt: option.Option(typeParameters[0])
    }));
}