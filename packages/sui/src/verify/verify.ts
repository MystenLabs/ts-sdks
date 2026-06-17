// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/bcs';

import type { PublicKey, SignatureFlag, SignatureScheme } from '../cryptography/index.js';
import { parseSerializedSignature, SIGNATURE_FLAG_TO_SCHEME } from '../cryptography/index.js';
import { Ed25519PublicKey } from '../keypairs/ed25519/publickey.js';
import { PasskeyPublicKey } from '../keypairs/passkey/publickey.js';
import { Secp256k1PublicKey } from '../keypairs/secp256k1/publickey.js';
import { Secp256r1PublicKey } from '../keypairs/secp256r1/publickey.js';
import { MultiSigPublicKey } from '../multisig/publickey.js';
import { ZkLoginPublicIdentifier } from '../zklogin/publickey.js';
import type { ClientWithCoreApi } from '../client/core.js';

/**
 * Whether `signature` is a valid signature over `bytes` (and, if `options.address`
 * is given, was produced by that address). Returns `false` for a malformed or
 * cryptographically invalid signature, or one that doesn't match the address;
 * only an *environmental* failure (e.g. a zkLogin JWK/epoch lookup) throws, so a
 * network blip is never reported as an invalid signature.
 */
export async function isValidSignature(
	bytes: Uint8Array,
	signature: string,
	options: { address?: string } = {},
): Promise<boolean> {
	const parsed = tryParseSignature(signature);
	if (!parsed) return false;
	if (!(await parsed.publicKey.verify(bytes, parsed.serializedSignature))) return false;
	return options.address ? parsed.publicKey.verifyAddress(options.address) : true;
}

/** Like {@link isValidSignature}, for a personal message. */
export async function isValidPersonalMessageSignature(
	message: Uint8Array,
	signature: string,
	options: { client?: ClientWithCoreApi; address?: string } = {},
): Promise<boolean> {
	const parsed = tryParseSignature(signature, { client: options.client });
	if (!parsed) return false;
	if (!(await parsed.publicKey.verifyPersonalMessage(message, parsed.serializedSignature))) {
		return false;
	}
	return options.address ? parsed.publicKey.verifyAddress(options.address) : true;
}

/** Like {@link isValidSignature}, for transaction bytes. */
export async function isValidTransactionSignature(
	transaction: Uint8Array,
	signature: string,
	options: { client?: ClientWithCoreApi; address?: string } = {},
): Promise<boolean> {
	const parsed = tryParseSignature(signature, { client: options.client });
	if (!parsed) return false;
	if (!(await parsed.publicKey.verifyTransaction(transaction, parsed.serializedSignature))) {
		return false;
	}
	return options.address ? parsed.publicKey.verifyAddress(options.address) : true;
}

export async function verifySignature(
	bytes: Uint8Array,
	signature: string,
	options: { address?: string } = {},
): Promise<PublicKey> {
	const { publicKey } = parseSignature(signature);
	if (!(await isValidSignature(bytes, signature))) {
		throw new Error(`Signature is not valid for the provided data`);
	}
	if (options.address && !publicKey.verifyAddress(options.address)) {
		throw new Error(`Signature is not valid for the provided address`);
	}
	return publicKey;
}

export async function verifyPersonalMessageSignature(
	message: Uint8Array,
	signature: string,
	options: { client?: ClientWithCoreApi; address?: string } = {},
): Promise<PublicKey> {
	const { publicKey } = parseSignature(signature, options);
	if (!(await isValidPersonalMessageSignature(message, signature, { client: options.client }))) {
		throw new Error(`Signature is not valid for the provided message`);
	}
	if (options.address && !publicKey.verifyAddress(options.address)) {
		throw new Error(`Signature is not valid for the provided address`);
	}
	return publicKey;
}

export async function verifyTransactionSignature(
	transaction: Uint8Array,
	signature: string,
	options: { client?: ClientWithCoreApi; address?: string } = {},
): Promise<PublicKey> {
	const { publicKey } = parseSignature(signature, options);
	if (!(await isValidTransactionSignature(transaction, signature, { client: options.client }))) {
		throw new Error(`Signature is not valid for the provided Transaction`);
	}
	if (options.address && !publicKey.verifyAddress(options.address)) {
		throw new Error(`Signature is not valid for the provided address`);
	}
	return publicKey;
}

function parseSignature(signature: string, options: { client?: ClientWithCoreApi } = {}) {
	const parsedSignature = parseSerializedSignature(signature);

	if (parsedSignature.signatureScheme === 'MultiSig') {
		return {
			...parsedSignature,
			publicKey: new MultiSigPublicKey(parsedSignature.multisig.multisig_pk),
		};
	}

	const publicKey = publicKeyFromRawBytes(
		parsedSignature.signatureScheme,
		parsedSignature.publicKey,
		options,
	);
	return {
		...parsedSignature,
		publicKey,
	};
}

/** {@link parseSignature}, returning `null` instead of throwing on a malformed signature. */
function tryParseSignature(signature: string, options: { client?: ClientWithCoreApi } = {}) {
	try {
		return parseSignature(signature, options);
	} catch {
		return null;
	}
}

export function publicKeyFromRawBytes(
	signatureScheme: SignatureScheme,
	bytes: Uint8Array,
	options: { client?: ClientWithCoreApi; address?: string } = {},
): PublicKey {
	let publicKey: PublicKey;
	switch (signatureScheme) {
		case 'ED25519':
			publicKey = new Ed25519PublicKey(bytes);
			break;
		case 'Secp256k1':
			publicKey = new Secp256k1PublicKey(bytes);
			break;
		case 'Secp256r1':
			publicKey = new Secp256r1PublicKey(bytes);
			break;
		case 'MultiSig':
			publicKey = new MultiSigPublicKey(bytes);
			break;
		case 'ZkLogin':
			publicKey = ZkLoginPublicIdentifier.fromBytes(bytes, options);
			break;
		case 'Passkey':
			publicKey = new PasskeyPublicKey(bytes);
			break;
		default:
			throw new Error(`Unsupported signature scheme ${signatureScheme}`);
	}

	if (options.address && publicKey.toSuiAddress() !== options.address) {
		throw new Error(`Public key bytes do not match the provided address`);
	}

	return publicKey;
}

export function publicKeyFromSuiBytes(
	publicKey: string | Uint8Array,
	options: { client?: ClientWithCoreApi; address?: string } = {},
) {
	const bytes = typeof publicKey === 'string' ? fromBase64(publicKey) : publicKey;

	const signatureScheme = SIGNATURE_FLAG_TO_SCHEME[bytes[0] as SignatureFlag];

	return publicKeyFromRawBytes(signatureScheme, bytes.slice(1), options);
}
