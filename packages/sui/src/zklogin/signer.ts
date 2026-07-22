// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '../client/core.js';
import type { IntentScope } from '../cryptography/intent.js';
import type { SignatureWithBytes } from '../cryptography/keypair.js';
import { Signer } from '../cryptography/keypair.js';
import type { SignatureScheme } from '../cryptography/signature-scheme.js';
import type { ZkLoginSignatureInputs } from './bcs.js';
import { extractClaimValue } from './jwt-utils.js';
import { toZkLoginPublicIdentifier, ZkLoginPublicIdentifier } from './publickey.js';
import { getZkLoginSignature } from './signature.js';

export interface ZkLoginSignerOptions {
	/** The ephemeral signer whose signature is wrapped by the zkLogin proof. */
	ephemeralSigner: Signer;
	/** The maxEpoch the proof was generated for. */
	maxEpoch: number;
	/** The zkLogin proof inputs, including the `addressSeed`. */
	inputs: ZkLoginSignatureInputs;
	/**
	 * Whether this account uses the deprecated legacy address derivation. The zkLogin address is
	 * derived from the proof inputs; this flag disambiguates legacy vs. current derivation, matching
	 * the rest of the zkLogin address API (e.g. `jwtToAddress`, `toZkLoginPublicIdentifier`).
	 *
	 * A wrong flag silently yields a signer for the wrong address; pass `address` to guard against it.
	 */
	legacyAddress: boolean;
	/**
	 * The expected zkLogin address. When provided, the address derived from `inputs` + `legacyAddress`
	 * is validated against it and the constructor throws on mismatch — guarding against a wrong
	 * `legacyAddress` flag producing a signer for the wrong address.
	 */
	address?: string;
	/** Optional client, threaded into the derived public key so it can verify signatures. */
	client?: ClientWithCoreApi;
}

/**
 * A transport- and provider-agnostic zkLogin signer.
 *
 * It wraps any ephemeral {@link Signer} and, for every signing operation, transforms the ephemeral
 * signature into a zkLogin signature using the supplied proof inputs and `maxEpoch`. Because every
 * signing method on {@link Signer} funnels through `signWithIntent`, overriding that single method is
 * enough to cover `signTransaction`, `signPersonalMessage`, and `signAndExecuteTransaction`.
 */
export class ZkLoginSigner extends Signer {
	#ephemeralSigner: Signer;
	#maxEpoch: number;
	#inputs: ZkLoginSignatureInputs;
	#legacyAddress: boolean;
	#client?: ClientWithCoreApi;
	#publicKey?: ZkLoginPublicIdentifier;

	constructor(options: ZkLoginSignerOptions) {
		super();
		this.#ephemeralSigner = options.ephemeralSigner;
		this.#maxEpoch = options.maxEpoch;
		this.#inputs = options.inputs;
		this.#legacyAddress = options.legacyAddress;
		this.#client = options.client;

		if (options.address !== undefined) {
			const derived = this.#derivePublicKey().toSuiAddress();
			if (derived !== options.address) {
				throw new Error(
					`zkLogin proof does not match the provided address (derived ${derived}, expected ` +
						`${options.address}) — check the \`legacyAddress\` flag`,
				);
			}
		}
	}

	// Shared derive-and-memoize used by both the constructor's address validation and getPublicKey().
	// It is `#private` (non-virtual) on purpose: the constructor must derive the *base* address even
	// when a subclass overrides getPublicKey() — calling the overridable getPublicKey() from the
	// constructor would dispatch to the subclass before its fields are initialized. Laziness also
	// means subclasses that override getPublicKey() (e.g. EnokiKeypair) never pay for this derivation.
	#derivePublicKey(): ZkLoginPublicIdentifier {
		return (this.#publicKey ??= toZkLoginPublicIdentifier(
			BigInt(this.#inputs.addressSeed),
			extractClaimValue<string>(this.#inputs.issBase64Details, 'iss'),
			{ legacyAddress: this.#legacyAddress, client: this.#client },
		));
	}

	/**
	 * The single extension point: the ephemeral signature is produced with the requested intent and
	 * then wrapped in a zkLogin signature.
	 */
	override async signWithIntent(
		bytes: Uint8Array,
		intent: IntentScope,
	): Promise<SignatureWithBytes> {
		const { bytes: signedBytes, signature: userSignature } =
			await this.#ephemeralSigner.signWithIntent(bytes, intent);

		return {
			bytes: signedBytes,
			signature: getZkLoginSignature({
				inputs: this.#inputs,
				maxEpoch: this.#maxEpoch,
				userSignature,
			}),
		};
	}

	sign(_data: Uint8Array): never {
		throw new Error(
			'ZkLoginSigner does not support signing directly. Use signTransaction or signPersonalMessage instead',
		);
	}

	getKeyScheme(): SignatureScheme {
		return 'ZkLogin';
	}

	getPublicKey(): ZkLoginPublicIdentifier {
		return this.#derivePublicKey();
	}
}
