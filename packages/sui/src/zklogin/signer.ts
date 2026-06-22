// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

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
	 */
	legacyAddress: boolean;
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
	#publicKey: ZkLoginPublicIdentifier;

	constructor(options: ZkLoginSignerOptions) {
		super();
		this.#ephemeralSigner = options.ephemeralSigner;
		this.#maxEpoch = options.maxEpoch;
		this.#inputs = options.inputs;
		this.#publicKey = toZkLoginPublicIdentifier(
			BigInt(options.inputs.addressSeed),
			extractClaimValue<string>(options.inputs.issBase64Details, 'iss'),
			{ legacyAddress: options.legacyAddress },
		);
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
		return this.#publicKey;
	}
}
