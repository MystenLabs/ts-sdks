import { bcs } from "@mysten/sui/bcs";
import * as object from "./object.js";
import * as balance from "./balance.js";
import * as vec_map from "./vec_map.js";
import * as string from "../0x0000000000000000000000000000000000000000000000000000000000000001/string.js";
import * as vec_set from "./vec_set.js";
import * as type_name from "../0x0000000000000000000000000000000000000000000000000000000000000001/type_name.js";
import * as option from "../0x0000000000000000000000000000000000000000000000000000000000000001/option.js";
export function Token() {
    return bcs.struct("Token", ({
        id: object.UID(),
        balance: balance.Balance()
    }));
}
export function TokenPolicyCap() {
    return bcs.struct("TokenPolicyCap", ({
        id: object.UID(),
        for: object.ID()
    }));
}
export function TokenPolicy() {
    return bcs.struct("TokenPolicy", ({
        id: object.UID(),
        spent_balance: balance.Balance(),
        rules: vec_map.VecMap(string.String(), vec_set.VecSet(type_name.TypeName()))
    }));
}
export function ActionRequest() {
    return bcs.struct("ActionRequest", ({
        name: string.String(),
        amount: bcs.u64(),
        sender: bcs.Address,
        recipient: option.Option(bcs.Address),
        spent_balance: option.Option(balance.Balance()),
        approvals: vec_set.VecSet(type_name.TypeName())
    }));
}
export function RuleKey() {
    return bcs.struct("RuleKey", ({
        is_protected: bcs.bool()
    }));
}
export function TokenPolicyCreated() {
    return bcs.struct("TokenPolicyCreated", ({
        id: object.ID(),
        is_mutable: bcs.bool()
    }));
}