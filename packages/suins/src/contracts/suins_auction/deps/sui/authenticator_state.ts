/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::authenticator_state';
export const AuthenticatorState = new MoveStruct({
	name: `${$moduleName}::AuthenticatorState`,
	fields: {
		id: bcs.Address,
		version: bcs.u64(),
	},
});
export const JwkId = new MoveStruct({
	name: `${$moduleName}::JwkId`,
	fields: {
		iss: bcs.string(),
		kid: bcs.string(),
	},
});
export const JWK = new MoveStruct({
	name: `${$moduleName}::JWK`,
	fields: {
		kty: bcs.string(),
		e: bcs.string(),
		n: bcs.string(),
		alg: bcs.string(),
	},
});
export const ActiveJwk = new MoveStruct({
	name: `${$moduleName}::ActiveJwk`,
	fields: {
		jwk_id: JwkId,
		jwk: JWK,
		epoch: bcs.u64(),
	},
});
export const AuthenticatorStateInner = new MoveStruct({
	name: `${$moduleName}::AuthenticatorStateInner`,
	fields: {
		version: bcs.u64(),
		/** List of currently active JWKs. */
		active_jwks: bcs.vector(ActiveJwk),
	},
});
