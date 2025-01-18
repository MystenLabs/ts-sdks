import { bcs } from "@mysten/sui/bcs";
import * as object from "./object.js";
import * as string from "../0x0000000000000000000000000000000000000000000000000000000000000001/string.js";
export function VerifiedID() {
    return bcs.struct("VerifiedID", ({
        id: object.UID(),
        owner: bcs.Address,
        key_claim_name: string.String(),
        key_claim_value: string.String(),
        issuer: string.String(),
        audience: string.String()
    }));
}