// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/bcs';

import type { PublicKey, SignatureFlag, SignatureScheme } from '../cryptography/index.js';
import { parseSerializedSignature, SIGNATURE_FLAG_TO_SCHEME } from '../cryptography/index.js';
import { Ed25519PublicKey } from '../keypairs/ed25519/publickey.js';
import { PasskeyPublicKey } from '../keypairs/passkey/publickey.js';
import { Secp256k1PublicKey } from '../keypairs/secp256k1/publickey.js';
import { Secp256r1PublicKey } from '../keypairs/secp256r1/publickey.js';
// eslint-disable-next-line import/no-cycle
import { MultiSigPublicKey } from '../multisig/publickey.js';
import type { ZkLoginCompatibleClient } from '../zklogin/publickey.js';
import { ZkLoginPublicIdentifier } from '../zklogin/publickey.js';

export async function verifySignature(
	bytes: Uint8Array,
	signature: string,
	options?: {
		address?: string;
	},
): Promise<PublicKey> {
	const parsedSignature = parseSignature(signature);

	if (!(await parsedSignature.publicKey.verify(bytes, parsedSignature.serializedSignature))) {
		throw new Error(`Signature is not valid for the provided data`);
	}

	if (options?.address && !parsedSignature.publicKey.verifyAddress(options.address)) {
		throw new Error(`Signature is not valid for the provided address`);
	}

	return parsedSignature.publicKey;
}

export async function verifyPersonalMessageSignature(
	message: Uint8Array,
	signature: string,
	options: { client?: ZkLoginCompatibleClient; address?: string } = {},
): Promise<PublicKey> {
	const parsedSignature = parseSignature(signature, options);

	if (
		!(await parsedSignature.publicKey.verifyPersonalMessage(
			message,
			parsedSignature.serializedSignature,
		))
	) {
		throw new Error(`Signature is not valid for the provided message`);
	}

	if (options?.address && !parsedSignature.publicKey.verifyAddress(options.address)) {
		throw new Error(`Signature is not valid for the provided address`);
	}

	return parsedSignature.publicKey;
}

export async function verifyTransactionSignature(
	transaction: Uint8Array,
	signature: string,
	options: { client?: ZkLoginCompatibleClient; address?: string } = {},
): Promise<PublicKey> {
	const parsedSignature = parseSignature(signature, options);

	if (
		!(await parsedSignature.publicKey.verifyTransaction(
			transaction,
			parsedSignature.serializedSignature,
		))
	) {
		throw new Error(`Signature is not valid for the provided Transaction`);
	}

	if (options?.address && !parsedSignature.publicKey.verifyAddress(options.address)) {
		throw new Error(`Signature is not valid for the provided address`);
	}

	return parsedSignature.publicKey;
}

function parseSignature(signature: string, options: { client?: ZkLoginCompatibleClient } = {}) {
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

export function publicKeyFromRawBytes(
	signatureScheme: SignatureScheme,
	bytes: Uint8Array,
	options: { client?: ZkLoginCompatibleClient; address?: string } = {},
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
	options: { client?: ZkLoginCompatibleClient; address?: string } = {},
) {
	const bytes = typeof publicKey === 'string' ? fromBase64(publicKey) : publicKey;

	const signatureScheme = SIGNATURE_FLAG_TO_SCHEME[bytes[0] as SignatureFlag];

	return publicKeyFromRawBytes(signatureScheme, bytes.slice(1), options);
}
