import { bcs } from "@mysten/sui/bcs";
import * as object from "./object.js";
import * as string from "../0x0000000000000000000000000000000000000000000000000000000000000001/string.js";
export function AuthenticatorState() {
    return bcs.struct("AuthenticatorState", ({
        id: object.UID(),
        version: bcs.u64()
    }));
}
export function AuthenticatorStateInner() {
    return bcs.struct("AuthenticatorStateInner", ({
        version: bcs.u64(),
        active_jwks: bcs.vector(ActiveJwk())
    }));
}
export function JWK() {
    return bcs.struct("JWK", ({
        kty: string.String(),
        e: string.String(),
        n: string.String(),
        alg: string.String()
    }));
}
export function JwkId() {
    return bcs.struct("JwkId", ({
        iss: string.String(),
        kid: string.String()
    }));
}
export function ActiveJwk() {
    return bcs.struct("ActiveJwk", ({
        jwk_id: JwkId(),
        jwk: JWK(),
        epoch: bcs.u64()
    }));
}