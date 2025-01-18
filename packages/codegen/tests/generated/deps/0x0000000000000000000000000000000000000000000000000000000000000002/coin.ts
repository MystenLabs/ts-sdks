import { bcs } from "@mysten/sui/bcs";
import * as object from "./object.js";
import * as balance from "./balance.js";
import * as string from "../0x0000000000000000000000000000000000000000000000000000000000000001/string.js";
import * as ascii from "../0x0000000000000000000000000000000000000000000000000000000000000001/ascii.js";
import * as option from "../0x0000000000000000000000000000000000000000000000000000000000000001/option.js";
import * as url from "./url.js";
export function Coin() {
    return bcs.struct("Coin", ({
        id: object.UID(),
        balance: balance.Balance()
    }));
}
export function CoinMetadata() {
    return bcs.struct("CoinMetadata", ({
        id: object.UID(),
        decimals: bcs.u8(),
        name: string.String(),
        symbol: ascii.String(),
        description: string.String(),
        icon_url: option.Option(url.Url())
    }));
}
export function RegulatedCoinMetadata() {
    return bcs.struct("RegulatedCoinMetadata", ({
        id: object.UID(),
        coin_metadata_object: object.ID(),
        deny_cap_object: object.ID()
    }));
}
export function TreasuryCap() {
    return bcs.struct("TreasuryCap", ({
        id: object.UID(),
        total_supply: balance.Supply()
    }));
}
export function DenyCapV2() {
    return bcs.struct("DenyCapV2", ({
        id: object.UID(),
        allow_global_pause: bcs.bool()
    }));
}
export function CurrencyCreated() {
    return bcs.struct("CurrencyCreated", ({
        decimals: bcs.u8()
    }));
}
export function DenyCap() {
    return bcs.struct("DenyCap", ({
        id: object.UID()
    }));
}