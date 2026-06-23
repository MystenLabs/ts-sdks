// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1PublicKey } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1PublicKey } from '@mysten/sui/keypairs/secp256r1';
import { fromBase64 } from '@mysten/sui/utils';

import { AwsClient } from './aws4fetch.js';
import { publicKeyFromDER, publicKeyFromEd25519DER } from './utils.js';

interface KmsCommands {
	Sign: {
		request: {
			KeyId: string;
			Message: string;
			MessageType: 'RAW' | 'DIGEST';
			SigningAlgorithm: 'ECDSA_SHA_256' | 'ED25519_SHA_512';
		};
		response: {
			KeyId: string;
			KeyOrigin: string;
			Signature: string;
			SigningAlgorithm: string;
		};
	};
	GetPublicKey: {
		request: { KeyId: string };
		response: {
			CustomerMasterKeySpec: string;
			KeyId: string;
			KeyOrigin: string;
			KeySpec: string;
			KeyUsage: string;
			PublicKey: string;
			SigningAlgorithms: string[];
		};
	};
}

/**
 * A resolved set of AWS credentials. Structurally compatible with the AWS SDK's
 * `AwsCredentialIdentity`, so providers from `@aws-sdk/credential-providers` can be passed directly.
 */
export interface AwsCredentialIdentity {
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken?: string;
}

/**
 * An async function that resolves AWS credentials. Compatible with the AWS SDK's
 * `AwsCredentialIdentityProvider` (e.g. the providers from `@aws-sdk/credential-providers`
 * such as `fromNodeProviderChain()`), enabling SSO, IAM roles, and automatic refresh of
 * temporary credentials.
 */
export type AwsCredentialProvider = () => Promise<AwsCredentialIdentity>;

export interface AwsClientOptions extends Partial<ConstructorParameters<typeof AwsClient>[0]> {
	/**
	 * An optional async credential provider. When supplied, credentials are resolved before
	 * each request instead of being captured statically at construction — enabling the standard
	 * AWS credential provider chain (SSO, IAM roles, container/instance metadata) and letting
	 * temporary credentials refresh automatically. Compatible with the providers exported by
	 * `@aws-sdk/credential-providers`.
	 */
	credentials?: AwsCredentialProvider;
}

export class AwsKmsClient extends AwsClient {
	/** Optional async credential provider, resolved before each request. */
	readonly #credentialsProvider?: AwsCredentialProvider;

	constructor(options: AwsClientOptions = {}) {
		const hasStaticCredentials = Boolean(options.accessKeyId && options.secretAccessKey);

		if (!hasStaticCredentials && !options.credentials) {
			throw new Error(
				'Either static credentials (`accessKeyId` and `secretAccessKey`) or a `credentials` provider is required',
			);
		}

		if (!options.region) {
			throw new Error('Region is required');
		}

		super({
			...options,
			service: 'kms',
			// aws4fetch requires non-null credentials at construction. When a provider is used,
			// pass placeholders here — `runCommand` resolves the real credentials before each
			// request via `#resolveCredentials`.
			accessKeyId: options.accessKeyId ?? '',
			secretAccessKey: options.secretAccessKey ?? '',
		});

		this.#credentialsProvider = options.credentials;
	}

	/**
	 * Resolves fresh credentials from the configured provider and applies them before signing
	 * the next request. No-op when static credentials were supplied instead.
	 *
	 * This is what lets temporary credentials (SSO, IAM roles, STS) refresh: provider chains
	 * memoize internally and only hit the network when the cached credentials are near expiry,
	 * so calling this before every request is cheap and correct.
	 */
	async #resolveCredentials() {
		if (!this.#credentialsProvider) {
			return;
		}

		const credentials = await this.#credentialsProvider();
		this.accessKeyId = credentials.accessKeyId;
		this.secretAccessKey = credentials.secretAccessKey;
		this.sessionToken = credentials.sessionToken;
	}

	async getPublicKey(keyId: string) {
		const publicKeyResponse = await this.runCommand('GetPublicKey', { KeyId: keyId });

		if (!publicKeyResponse.PublicKey) {
			throw new Error('Public Key not found for the supplied `keyId`');
		}

		const derBytes = fromBase64(publicKeyResponse.PublicKey);

		switch (publicKeyResponse.KeySpec) {
			case 'ECC_NIST_P256':
				return new Secp256r1PublicKey(publicKeyFromDER(derBytes));
			case 'ECC_SECG_P256K1':
				return new Secp256k1PublicKey(publicKeyFromDER(derBytes));
			case 'ECC_NIST_EDWARDS25519':
				return new Ed25519PublicKey(publicKeyFromEd25519DER(derBytes));
			default:
				throw new Error('Unsupported key spec: ' + publicKeyResponse.KeySpec);
		}
	}

	async runCommand<T extends keyof KmsCommands>(
		command: T,
		body: KmsCommands[T]['request'],
		{
			region = this.region!,
		}: {
			region?: string;
		} = {},
	): Promise<KmsCommands[T]['response']> {
		if (!region) {
			throw new Error('Region is required');
		}

		// Resolve fresh credentials before signing (no-op unless a provider was configured).
		await this.#resolveCredentials();

		const res = await this.fetch(`https://kms.${region}.amazonaws.com/`, {
			headers: {
				'Content-Type': 'application/x-amz-json-1.1',
				'X-Amz-Target': `TrentService.${command}`,
			},
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			throw new Error(await res.text());
		}

		return res.json();
	}
}
