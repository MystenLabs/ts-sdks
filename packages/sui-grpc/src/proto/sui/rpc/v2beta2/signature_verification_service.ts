// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { ServiceType } from '@protobuf-ts/runtime-rpc';
import type { BinaryWriteOptions } from '@protobuf-ts/runtime';
import type { IBinaryWriter } from '@protobuf-ts/runtime';
import { WireType } from '@protobuf-ts/runtime';
import type { BinaryReadOptions } from '@protobuf-ts/runtime';
import type { IBinaryReader } from '@protobuf-ts/runtime';
import { UnknownFieldHandler } from '@protobuf-ts/runtime';
import type { PartialMessage } from '@protobuf-ts/runtime';
import { reflectionMergePartial } from '@protobuf-ts/runtime';
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
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Bcs message = 1;
	 */
	message?: Bcs;
	/**
	 * The siganture to verify.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.UserSignature signature = 2;
	 */
	signature?: UserSignature;
	/**
	 * Optional. Address to validate against the provided signature.
	 *
	 * If provided, this address will be compared against the the address derived
	 * from the provide signature and a successful response will only be returned
	 * if they match.
	 *
	 * @generated from protobuf field: optional string address = 3;
	 */
	address?: string;
	/**
	 * The set of JWKs to use when verifying Zklogin signatures.
	 * If this is empty the current set of valid JWKs stored onchain will be used
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.ActiveJwk jwks = 4;
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
	 * @generated from protobuf field: optional bool is_valid = 1;
	 */
	isValid?: boolean;
	/**
	 * If `is_valid` is `false`, this is the reason for why the signature verification failed.
	 *
	 * @generated from protobuf field: optional string reason = 2;
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
			{ no: 4, name: 'jwks', kind: 'message', repeat: 1 /*RepeatType.PACKED*/, T: () => ActiveJwk },
		]);
	}
	create(value?: PartialMessage<VerifySignatureRequest>): VerifySignatureRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.jwks = [];
		if (value !== undefined) reflectionMergePartial<VerifySignatureRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: VerifySignatureRequest,
	): VerifySignatureRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.Bcs message */ 1:
					message.message = Bcs.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.message,
					);
					break;
				case /* optional sui.rpc.v2beta2.UserSignature signature */ 2:
					message.signature = UserSignature.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.signature,
					);
					break;
				case /* optional string address */ 3:
					message.address = reader.string();
					break;
				case /* repeated sui.rpc.v2beta2.ActiveJwk jwks */ 4:
					message.jwks.push(ActiveJwk.internalBinaryRead(reader, reader.uint32(), options));
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: VerifySignatureRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.Bcs message = 1; */
		if (message.message)
			Bcs.internalBinaryWrite(
				message.message,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.UserSignature signature = 2; */
		if (message.signature)
			UserSignature.internalBinaryWrite(
				message.signature,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string address = 3; */
		if (message.address !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.address);
		/* repeated sui.rpc.v2beta2.ActiveJwk jwks = 4; */
		for (let i = 0; i < message.jwks.length; i++)
			ActiveJwk.internalBinaryWrite(
				message.jwks[i],
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
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
	create(value?: PartialMessage<VerifySignatureResponse>): VerifySignatureResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<VerifySignatureResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: VerifySignatureResponse,
	): VerifySignatureResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional bool is_valid */ 1:
					message.isValid = reader.bool();
					break;
				case /* optional string reason */ 2:
					message.reason = reader.string();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: VerifySignatureResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional bool is_valid = 1; */
		if (message.isValid !== undefined) writer.tag(1, WireType.Varint).bool(message.isValid);
		/* optional string reason = 2; */
		if (message.reason !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.reason);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
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
