import { bcs } from "@mysten/sui/bcs";
import * as object from "./../../../deps/0000000000000000000000000000000000000000000000000000000000000002/object";
export function VerifiedIssuer() {
    return bcs.struct("VerifiedIssuer", ({
        id: object.UID(),
        owner: bcs.Address,
        issuer: bcs.string()
    }));
}