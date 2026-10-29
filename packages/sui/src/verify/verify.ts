// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/bcs';

import type { PublicKey, SignatureFlag, SignatureScheme } from '../cryptography/index.js';
import { parseSerializedSignature, SIGNATURE_FLAG_TO_SCHEME } from '../cryptography/index.js';
import { Ed25519PublicKey } from '../keypairs/ed25519/publickey.js';
import { MLDSA65PublicKey } from '../keypairs/mldsa65/publickey.js';
import { PasskeyPublicKey } from '../keypairs/passkey/publickey.js';
import { Secp256k1PublicKey } from '../keypairs/secp256k1/publickey.js';
import { Secp256r1PublicKey } from '../keypairs/secp256r1/publickey.js';
import { MultiSigPublicKey } from '../multisig/publickey.js';
import { ZkLoginPublicIdentifier } from '../zklogin/publickey.js';
import type { ClientWithCoreApi } from '../client/core.js';
import { normalizeSuiAddress } from '../utils/sui-types.js';

/**
 * How to verify a signature: on a Sui node through `client`, or locally with `offline: true`. To
 * verify on a node without loading keypair code, use `client.verifySignature`; these helpers
 * also return the signer's public key.
 *
 * With a client, the node checks the signature and, when `address` is given, that the signer is
 * `address` or one of its current address aliases (`checkAddressAliases`, default `true`; ignored
 * without `address`). Use a client for the network the account is on.
 *
 * Offline verification checks that the signer is `address` itself and can't verify zkLogin
 * signatures. It also accepts `address`'s own key after the account removed it from its alias set,
 * so use a client when that matters.
 */
export type VerifyOptions =
	| { client: ClientWithCoreApi; offline?: false; address?: string; checkAddressAliases?: boolean }
	| { offline: true; address?: string; checkAddressAliases?: false };

/** Options for the raw-bytes helpers, which only verify locally. */
export interface VerifyOfflineOptions {
	offline: true;
	address?: string;
}

type Scope = 'PersonalMessage' | 'TransactionData' | 'Raw';

const SCOPE_LABEL: Record<Scope, string> = {
	PersonalMessage: 'message',
	TransactionData: 'Transaction',
	Raw: 'data',
};

/**
 * Whether `signature` is a valid signature over `bytes`, verified locally. It can't check address
 * aliases or zkLogin signatures (it throws for zkLogin): for account checks, use
 * `client.verifySignature`.
 *
 * Returns `false` for an invalid signature or one not from `address`.
 *
 * Pass `address` when checking a signature for an account; without it, any valid signature passes.
 */
export async function isValidSignature(
	bytes: Uint8Array,
	signature: string,
	options: VerifyOfflineOptions,
): Promise<boolean> {
	return 'publicKey' in (await checkSignature(bytes, signature, 'Raw', offlineOnly(options)));
}

/**
 * Whether `signature` is a valid signature over the personal message `message`. Returns `false`
 * for an invalid signature, or one from a signer not authorized for `address`. Throws for a network
 * error, a node that did not apply the address alias check, or a zkLogin signature offline.
 * `checkAddressAliases` is ignored without `address`.
 *
 * Pass `address` when checking a signature for an account; without it, any valid signature passes.
 */
export async function isValidPersonalMessageSignature(
	message: Uint8Array,
	signature: string,
	options: VerifyOptions,
): Promise<boolean> {
	return 'publicKey' in (await checkSignature(message, signature, 'PersonalMessage', options));
}

/**
 * Whether `signature` is a valid signature over the transaction bytes. Returns `false` for an
 * invalid signature, or one from a signer not authorized for `address`. Throws for a network error,
 * a node that did not apply the address alias check, or a zkLogin signature offline.
 * `checkAddressAliases` is ignored without `address`.
 *
 * Pass `address` when checking a signature for an account; without it, any valid signature passes.
 */
export async function isValidTransactionSignature(
	transaction: Uint8Array,
	signature: string,
	options: VerifyOptions,
): Promise<boolean> {
	return 'publicKey' in (await checkSignature(transaction, signature, 'TransactionData', options));
}

/**
 * Verifies `signature` over `bytes` locally and returns the signer's public key. It can't check
 * address aliases or zkLogin signatures (it throws for zkLogin): for account checks, use
 * `client.verifySignature`, or {@link verifyPersonalMessageSignature} or
 * {@link verifyTransactionSignature} with a client.
 *
 * Pass `address` when checking a signature for an account; without it, any valid signature passes.
 */
export async function verifySignature(
	bytes: Uint8Array,
	signature: string,
	options: VerifyOfflineOptions,
): Promise<PublicKey> {
	return expectValid(await checkSignature(bytes, signature, 'Raw', offlineOnly(options)));
}

/**
 * Verifies a personal message signature and returns the signer's public key. Throws if the
 * signature is invalid or its signer is not authorized for `address`, and for the errors listed on
 * {@link isValidPersonalMessageSignature}. The returned key may belong to one of `address`'s
 * aliases, so use `address`, not `publicKey.toSuiAddress()`, as the account's identity.
 *
 * Pass `address` when checking a signature for an account; without it, any valid signature passes.
 */
export async function verifyPersonalMessageSignature(
	message: Uint8Array,
	signature: string,
	options: VerifyOptions,
): Promise<PublicKey> {
	return expectValid(await checkSignature(message, signature, 'PersonalMessage', options));
}

/**
 * Verifies a transaction signature and returns the signer's public key. Throws if the signature is
 * invalid or its signer is not authorized for `address`, and for the errors listed on
 * {@link isValidTransactionSignature}. The returned key may belong to one of `address`'s aliases,
 * so use `address`, not `publicKey.toSuiAddress()`, as the account's identity.
 *
 * Pass `address` when checking a signature for an account; without it, any valid signature passes.
 */
export async function verifyTransactionSignature(
	transaction: Uint8Array,
	signature: string,
	options: VerifyOptions,
): Promise<PublicKey> {
	return expectValid(await checkSignature(transaction, signature, 'TransactionData', options));
}

type CheckResult = { publicKey: PublicKey } | { error: string };

function expectValid(result: CheckResult): PublicKey {
	if ('error' in result) {
		throw new Error(result.error);
	}
	return result.publicKey;
}

function offlineOnly(options: VerifyOfflineOptions): VerifyOptions {
	if (options?.offline !== true) {
		throw new Error(
			'Raw-bytes signatures can only be verified offline: pass `offline: true`, or use ' +
				'verifyPersonalMessageSignature or verifyTransactionSignature with a client.',
		);
	}
	return options;
}

async function checkSignature(
	bytes: Uint8Array,
	signature: string,
	scope: Scope,
	options: VerifyOptions,
): Promise<CheckResult> {
	if (options?.offline !== true && !options?.client) {
		throw new Error(
			'Pass a client to verify signatures, or `offline: true` to verify without network access.',
		);
	}

	const invalid = { error: `Signature is not valid for the provided ${SCOPE_LABEL[scope]}` };
	const parsed = tryParseSignature(signature, options.offline ? {} : { client: options.client });
	if (!parsed) return invalid;
	const address = options.address ? normalizeSuiAddress(options.address) : undefined;

	if (options.offline) {
		if (
			parsed.signatureScheme === 'ZkLogin' ||
			(parsed.signatureScheme === 'MultiSig' &&
				parsed.multisig.sigs.some((sig) => 'ZkLogin' in sig))
		) {
			throw new Error(
				"zkLogin signatures can't be verified offline. Pass a client to verify them on a Sui node.",
			);
		}

		const { publicKey, serializedSignature } = parsed;
		const valid =
			scope === 'PersonalMessage'
				? await publicKey.verifyPersonalMessage(bytes, serializedSignature)
				: scope === 'TransactionData'
					? await publicKey.verifyTransaction(bytes, serializedSignature)
					: await publicKey.verify(bytes, serializedSignature);
		if (!valid) return invalid;
		if (address && !publicKey.verifyAddress(address)) {
			return { error: 'Signature is not valid for the provided address' };
		}
		return { publicKey };
	}

	const { publicKey } = parsed;
	const { client, checkAddressAliases } = options;
	const result = await client.core.verifySignature(
		scope === 'PersonalMessage'
			? { personalMessage: bytes, signature, address, checkAddressAliases }
			: { transaction: bytes, signature, address, checkAddressAliases },
	);
	if (!result.valid) {
		return { error: `${invalid.error}${result.reason ? `: ${result.reason}` : ''}` };
	}

	// A zkLogin signature parses to the current address derivation; return the legacy one when
	// that is the address being verified.
	if (
		address &&
		publicKey instanceof ZkLoginPublicIdentifier &&
		publicKey.toSuiAddress() !== address &&
		publicKey.verifyAddress(address)
	) {
		return {
			publicKey: ZkLoginPublicIdentifier.fromBytes(publicKey.toRawBytes(), {
				client: options.client,
				legacyAddress: true,
			}),
		};
	}

	return { publicKey };
}

function parseSignature(signature: string, options: { client?: ClientWithCoreApi } = {}) {
	const parsedSignature = parseSerializedSignature(signature);

	if (parsedSignature.signatureScheme === 'MultiSig') {
		return {
			...parsedSignature,
			publicKey: new MultiSigPublicKey(parsedSignature.multisig.multisig_pk, {
				client: options.client,
			}),
		};
	}

	return {
		...parsedSignature,
		publicKey: publicKeyFromRawBytes(
			parsedSignature.signatureScheme,
			parsedSignature.publicKey,
			options,
		),
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

/**
 * Parses a public key. It doesn't verify a signature; `address` only asserts that the key derives
 * that address, with no address alias check.
 */
export function publicKeyFromRawBytes(
	signatureScheme: SignatureScheme,
	bytes: Uint8Array,
	{ client, address }: { client?: ClientWithCoreApi; address?: string } = {},
): PublicKey {
	address = address ? normalizeSuiAddress(address) : undefined;
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
			publicKey = new MultiSigPublicKey(bytes, { client });
			break;
		case 'ZkLogin':
			publicKey = ZkLoginPublicIdentifier.fromBytes(bytes, { client, address });
			break;
		case 'Passkey':
			publicKey = new PasskeyPublicKey(bytes);
			break;
		case 'MLDSA65':
			publicKey = new MLDSA65PublicKey(bytes);
			break;
		default:
			throw new Error(`Unsupported signature scheme ${signatureScheme}`);
	}

	if (address && publicKey.toSuiAddress() !== address) {
		throw new Error(`Public key bytes do not match the provided address`);
	}

	return publicKey;
}

/** Parses a Sui-encoded (flag-prefixed) public key. See {@link publicKeyFromRawBytes}. */
export function publicKeyFromSuiBytes(
	publicKey: string | Uint8Array,
	options: { client?: ClientWithCoreApi; address?: string } = {},
) {
	const bytes = typeof publicKey === 'string' ? fromBase64(publicKey) : publicKey;

	const signatureScheme = SIGNATURE_FLAG_TO_SCHEME[bytes[0] as SignatureFlag];

	return publicKeyFromRawBytes(signatureScheme, bytes.slice(1), options);
}
