// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { ServiceType } from '@protobuf-ts/runtime-rpc';
import { MessageType } from '@protobuf-ts/runtime';
import { ActiveJwk } from './transaction.js';
import { UserSignature } from './signature.js';
import { Bcs } from './bcs.js';
/**
 * @generated from protobuf message sui.rpc.v2beta2.VerifySignatureRequest
 */
export interface VerifySignatureRequest {
	/**
	 * The message to verify against.
	 *
	 * Today the only supported message types are `PersonalMessage` and
	 * `TransactionData` and the `Bcs.name` must be set to indicate which type of
	 * message is being verified.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Bcs message = 1
	 */
	message?: Bcs;
	/**
	 * The siganture to verify.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.UserSignature signature = 2
	 */
	signature?: UserSignature;
	/**
	 * Optional. Address to validate against the provided signature.
	 *
	 * If provided, this address will be compared against the the address derived
	 * from the provide signature and a successful response will only be returned
	 * if they match.
	 *
	 * @generated from protobuf field: optional string address = 3
	 */
	address?: string;
	/**
	 * The set of JWKs to use when verifying Zklogin signatures.
	 * If this is empty the current set of valid JWKs stored onchain will be used
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.ActiveJwk jwks = 4
	 */
	jwks: ActiveJwk[];
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.VerifySignatureResponse
 */
export interface VerifySignatureResponse {
	/**
	 * Indicates if the provided signature was valid given the requested parameters.
	 *
	 * @generated from protobuf field: optional bool is_valid = 1
	 */
	isValid?: boolean;
	/**
	 * If `is_valid` is `false`, this is the reason for why the signature verification failed.
	 *
	 * @generated from protobuf field: optional string reason = 2
	 */
	reason?: string;
}
// @generated message type with reflection information, may provide speed optimized methods
class VerifySignatureRequest$Type extends MessageType<VerifySignatureRequest> {
	constructor() {
		super('sui.rpc.v2beta2.VerifySignatureRequest', [
			{ no: 1, name: 'message', kind: 'message', T: () => Bcs },
			{ no: 2, name: 'signature', kind: 'message', T: () => UserSignature },
			{ no: 3, name: 'address', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 4,
				name: 'jwks',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => ActiveJwk,
			},
		]);
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.VerifySignatureRequest
 */
export const VerifySignatureRequest = new VerifySignatureRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class VerifySignatureResponse$Type extends MessageType<VerifySignatureResponse> {
	constructor() {
		super('sui.rpc.v2beta2.VerifySignatureResponse', [
			{ no: 1, name: 'is_valid', kind: 'scalar', opt: true, T: 8 /*ScalarType.BOOL*/ },
			{ no: 2, name: 'reason', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.VerifySignatureResponse
 */
export const VerifySignatureResponse = new VerifySignatureResponse$Type();
/**
 * @generated ServiceType for protobuf service sui.rpc.v2beta2.SignatureVerificationService
 */
export const SignatureVerificationService = new ServiceType(
	'sui.rpc.v2beta2.SignatureVerificationService',
	[{ name: 'VerifySignature', options: {}, I: VerifySignatureRequest, O: VerifySignatureResponse }],
);
