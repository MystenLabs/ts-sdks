// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Signer } from '@mysten/sui/cryptography';
import type { ZkLoginSignatureInputs } from '@mysten/sui/zklogin';
import { ZkLoginPublicIdentifier, ZkLoginSigner } from '@mysten/sui/zklogin';

export class EnokiPublicKey extends ZkLoginPublicIdentifier {}

export class EnokiKeypair extends ZkLoginSigner {
	#publicKey: EnokiPublicKey;

	constructor(input: {
		address: string;
		maxEpoch: number;
		proof: ZkLoginSignatureInputs;
		ephemeralKeypair: Signer;
	}) {
		// Resolve the public key exactly as before — `fromProof` matches the proof against the
		// supplied address and validates it — then bridge that to the base's `legacyAddress` flag.
		const publicKey = EnokiPublicKey.fromProof(input.address, input.proof);
		super({
			ephemeralSigner: input.ephemeralKeypair,
			maxEpoch: input.maxEpoch,
			inputs: input.proof,
			legacyAddress: publicKey.legacyAddress,
		});
		this.#publicKey = publicKey;
	}

	override getPublicKey(): EnokiPublicKey {
		return this.#publicKey;
	}
}
