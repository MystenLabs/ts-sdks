// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase64 } from '@mysten/bcs';
import { bcs } from '@mysten/sui/bcs';
import type { Signer } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { isValidNamedPackage, isValidSuiAddress, isValidSuiObjectId } from '@mysten/sui/utils';
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';
import { generateSecretKey, toPublicKey, toVerificationKey } from './elgamal.js';
import {
	ExpiredSessionKeyError,
	InvalidPackageError,
	InvalidPersonalMessageSignatureError,
	UserError,
} from './error.js';
import type { SealCompatibleClient } from './types.js';

export const RequestFormat = bcs.struct('RequestFormat', {
	ptb: bcs.vector(bcs.u8()),
	encKey: bcs.vector(bcs.u8()),
	encVerificationKey: bcs.vector(bcs.u8()),
});

export type Certificate = {
	user: string;
	session_vk: string;
	creation_time: number;
	ttl_min: number;
	signature: string;
	mvr_name?: string;
};

export type ExportedSessionKey = {
	address: string;
	packageId: string;
	mvrName?: string;
	creationTimeMs: number;
	ttlMin: number;
	personalMessageSignature?: string;
	sessionKey: string;
};

export class SessionKey {
	#address: string;
	#packageId: string;
	#mvrName?: string;
	#creationTimeMs: number;
	#ttlMin: number;
	#sessionKey: Ed25519Keypair;
	#personalMessageSignature?: string;
	#signer?: Signer;
	#suiClient: SealCompatibleClient;

	private constructor({
		address,
		packageId,
		mvrName,
		ttlMin,
		signer,
		suiClient,
	}: {
		address: string;
		packageId: string;
		mvrName?: string;
		ttlMin: number;
		signer?: Signer;
		suiClient: SealCompatibleClient;
	}) {
		if (mvrName && !isValidNamedPackage(mvrName)) {
			throw new UserError(`Invalid package name ${mvrName}`);
		}
		if (!isValidSuiObjectId(packageId) || !isValidSuiAddress(address)) {
			throw new UserError(`Invalid package ID ${packageId} or address ${address}`);
		}
		if (ttlMin > 30 || ttlMin < 1) {
			throw new UserError(`Invalid TTL ${ttlMin}, must be between 1 and 30`);
		}
		if (signer && signer.getPublicKey().toSuiAddress() !== address) {
			throw new UserError('Signer address does not match session key address');
		}

		this.#address = address;
		this.#packageId = packageId;
		this.#mvrName = mvrName;
		this.#creationTimeMs = Date.now();
		this.#ttlMin = ttlMin;
		this.#sessionKey = Ed25519Keypair.generate();
		this.#signer = signer;
		this.#suiClient = suiClient;
	}

	/**
	 * Create a new SessionKey instance.
	 * @param address - The address of the user.
	 * @param packageId - The ID of the package.
	 * @param mvrName - Optional. The name of the MVR, if there is one.
	 * @param ttlMin - The TTL in minutes.
	 * @param signer - Optional. The signer instance, e.g. EnokiSigner.
	 * @param suiClient - The Sui client.
	 * @returns A new SessionKey instance.
	 */
	static async create({
		address,
		packageId,
		mvrName,
		ttlMin,
		signer,
		suiClient,
	}: {
		address: string;
		packageId: string;
		mvrName?: string;
		ttlMin: number;
		signer?: Signer;
		suiClient: SealCompatibleClient;
	}): Promise<SessionKey> {
		const packageObj = await suiClient.core.getObject({ objectId: packageId });
		if (String(packageObj.object.version) !== '1') {
			throw new InvalidPackageError(`Package ${packageId} is not the first version`);
		}

		return new SessionKey({
			address,
			packageId,
			mvrName,
			ttlMin,
			signer,
			suiClient,
		});
	}
	isExpired(): boolean {
		// Allow 10 seconds for clock skew
		return this.#creationTimeMs + this.#ttlMin * 60 * 1000 - 10_000 < Date.now();
	}

	getAddress(): string {
		return this.#address;
	}

	getPackageName(): string {
		if (this.#mvrName) {
			return this.#mvrName;
		}
		return this.#packageId;
	}

	getPackageId(): string {
		return this.#packageId;
	}

	getPersonalMessage(): Uint8Array {
		const creationTimeUtc =
			new Date(this.#creationTimeMs).toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
		const message = `Accessing keys of package ${this.getPackageName()} for ${this.#ttlMin} mins from ${creationTimeUtc}, session key ${toBase64(this.#sessionKey.getPublicKey().toRawBytes())}`;
		return new TextEncoder().encode(message);
	}

	async setPersonalMessageSignature(personalMessageSignature: string) {
		if (!this.#personalMessageSignature) {
			try {
				await verifyPersonalMessageSignature(this.getPersonalMessage(), personalMessageSignature, {
					address: this.#address,
					client: this.#suiClient,
				});
				this.#personalMessageSignature = personalMessageSignature;
			} catch (e) {
				throw new InvalidPersonalMessageSignatureError('Not valid');
			}
		}
	}

	async getCertificate(): Promise<Certificate> {
		if (!this.#personalMessageSignature) {
			if (this.#signer) {
				const { signature } = await this.#signer.signPersonalMessage(this.getPersonalMessage());
				this.#personalMessageSignature = signature;
			} else {
				throw new InvalidPersonalMessageSignatureError('Personal message signature is not set');
			}
		}
		return {
			user: this.#address,
			session_vk: toBase64(this.#sessionKey.getPublicKey().toRawBytes()),
			creation_time: this.#creationTimeMs,
			ttl_min: this.#ttlMin,
			signature: this.#personalMessageSignature,
			mvr_name: this.#mvrName,
		};
	}

	/**
	 * Create request params for the given transaction bytes.
	 * @param txBytes - The transaction bytes.
	 * @returns The request params containing the ephemeral secret key,
	 * its public key and its verification key.
	 */
	async createRequestParams(txBytes: Uint8Array): Promise<{
		encKey: Uint8Array<ArrayBuffer>;
		encKeyPk: Uint8Array<ArrayBuffer>;
		encVerificationKey: Uint8Array<ArrayBuffer>;
		requestSignature: string;
	}> {
		if (this.isExpired()) {
			throw new ExpiredSessionKeyError();
		}
		const encKey = generateSecretKey();
		const encKeyPk = toPublicKey(encKey);
		const encVerificationKey = toVerificationKey(encKey);

		const msgToSign = RequestFormat.serialize({
			ptb: txBytes.slice(1),
			encKey: encKeyPk,
			encVerificationKey,
		}).toBytes();
		return {
			encKey,
			encKeyPk,
			encVerificationKey,
			requestSignature: toBase64(await this.#sessionKey.sign(msgToSign)),
		};
	}

	/**
	 * Export the Session Key object from the instance. Store the object in IndexedDB to persist.
	 */
	export(): ExportedSessionKey {
		const obj = {
			address: this.#address,
			packageId: this.#packageId,
			mvrName: this.#mvrName,
			creationTimeMs: this.#creationTimeMs,
			ttlMin: this.#ttlMin,
			personalMessageSignature: this.#personalMessageSignature,
			sessionKey: this.#sessionKey.getSecretKey(), // bech32 encoded string
		};

		Object.defineProperty(obj, 'toJSON', {
			enumerable: false,
			value: () => {
				throw new Error('This object is not serializable');
			},
		});
		return obj;
	}

	/**
	 * Restore a SessionKey instance for the given object.
	 * @returns A new SessionKey instance with restored state
	 */
	static import(
		data: ExportedSessionKey,
		suiClient: SealCompatibleClient,
		signer?: Signer,
	): SessionKey {
		const instance = new SessionKey({
			address: data.address,
			packageId: data.packageId,
			mvrName: data.mvrName,
			ttlMin: data.ttlMin,
			signer,
			suiClient,
		});

		instance.#creationTimeMs = data.creationTimeMs;
		instance.#sessionKey = Ed25519Keypair.fromSecretKey(data.sessionKey);
		instance.#personalMessageSignature = data.personalMessageSignature;

		if (instance.isExpired()) {
			throw new ExpiredSessionKeyError();
		}
		return instance;
	}
}
