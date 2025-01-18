import { bcs } from "@mysten/sui/bcs";
import * as object from "../0x0000000000000000000000000000000000000000000000000000000000000002/object.js";
import * as balance from "../0x0000000000000000000000000000000000000000000000000000000000000002/balance.js";
export function Exchange() {
    return bcs.struct("Exchange", ({
        id: object.UID(),
        wal: balance.Balance(),
        sui: balance.Balance(),
        rate: ExchangeRate(),
        admin: object.ID()
    }));
}
export function AdminCap() {
    return bcs.struct("AdminCap", ({
        id: object.UID()
    }));
}
export function ExchangeRate() {
    return bcs.struct("ExchangeRate", ({
        wal: bcs.u64(),
        sui: bcs.u64()
    }));
}