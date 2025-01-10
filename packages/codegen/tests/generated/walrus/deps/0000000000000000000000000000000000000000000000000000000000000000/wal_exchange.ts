import { bcs } from "@mysten/sui/bcs";
import * as object from "./../../../deps/0000000000000000000000000000000000000000000000000000000000000002/object";
import * as balance from "./../../../deps/0000000000000000000000000000000000000000000000000000000000000002/balance";
export function Exchange() {
    return bcs.struct("Exchange", ({
        id: object.UID(),
        wal: balance.Balance(),
        sui: balance.Balance(),
        rate: ExchangeRate(),
        admin: bcs.Address
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