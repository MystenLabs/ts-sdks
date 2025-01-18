import { bcs } from "@mysten/sui/bcs";
import * as object from "./object.js";
import * as balance from "./balance.js";
export function Kiosk() {
    return bcs.struct("Kiosk", ({
        id: object.UID(),
        profits: balance.Balance(),
        owner: bcs.Address,
        item_count: bcs.u32(),
        allow_extensions: bcs.bool()
    }));
}
export function KioskOwnerCap() {
    return bcs.struct("KioskOwnerCap", ({
        id: object.UID(),
        for: object.ID()
    }));
}
export function PurchaseCap() {
    return bcs.struct("PurchaseCap", ({
        id: object.UID(),
        kiosk_id: object.ID(),
        item_id: object.ID(),
        min_price: bcs.u64()
    }));
}
export function Borrow() {
    return bcs.struct("Borrow", ({
        kiosk_id: object.ID(),
        item_id: object.ID()
    }));
}
export function Item() {
    return bcs.struct("Item", ({
        id: object.ID()
    }));
}
export function Listing() {
    return bcs.struct("Listing", ({
        id: object.ID(),
        is_exclusive: bcs.bool()
    }));
}
export function Lock() {
    return bcs.struct("Lock", ({
        id: object.ID()
    }));
}
export function ItemListed() {
    return bcs.struct("ItemListed", ({
        kiosk: object.ID(),
        id: object.ID(),
        price: bcs.u64()
    }));
}
export function ItemPurchased() {
    return bcs.struct("ItemPurchased", ({
        kiosk: object.ID(),
        id: object.ID(),
        price: bcs.u64()
    }));
}
export function ItemDelisted() {
    return bcs.struct("ItemDelisted", ({
        kiosk: object.ID(),
        id: object.ID()
    }));
}