import { bcs } from "@mysten/sui/bcs";
import * as object from "./object.js";
import * as string from "../0x0000000000000000000000000000000000000000000000000000000000000001/string.js";
export function VerifiedIssuer() {
    return bcs.struct("VerifiedIssuer", ({
        id: object.UID(),
        owner: bcs.Address,
        issuer: string.String()
    }));
}