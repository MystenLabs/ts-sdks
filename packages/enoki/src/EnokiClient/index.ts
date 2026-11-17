// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	CreateSponsoredTransactionApiInput,
	CreateSponsoredTransactionApiResponse,
	CreateSubnameApiInput,
	CreateSubnameApiResponse,
	CreateZkLoginNonceApiInput,
	CreateZkLoginNonceApiResponse,
	CreateZkLoginZkpApiInput,
	CreateZkLoginZkpApiResponse,
	DeleteSubnameApiInput,
	DeleteSubnameApiResponse,
	ExecuteSponsoredTransactionApiInput,
	ExecuteSponsoredTransactionApiResponse,
	GetAppApiInput,
	GetAppApiResponse,
	GetSubnamesApiInput,
	GetSubnamesApiResponse,
	GetZkLoginAddressesApiInput,
	GetZkLoginAddressesApiResponse,
	GetZkLoginApiInput,
	GetZkLoginApiResponse,
	SponsorAndExecuteTransactionApiInput,
	SponsorAndExecuteTransactionApiResponse,
} from './type.js';

const DEFAULT_API_URL = 'https://api.enoki.mystenlabs.com';
const ZKLOGIN_HEADER = 'zklogin-jwt';

export interface EnokiClientConfig {
	/** The API key for the Enoki app, available in the Enoki Portal. */
	apiKey: string;

	/** The API URL for Enoki. In most cases, this should not be set. */
	apiUrl?: string;

	/** The amount of epochs that you would like to have the nonce be valid for. Range: `0 <= value <= 30` */
	additionalEpochs?: number;
}

export class EnokiClientError extends Error {
	errors: { code: string; message: string; data: unknown }[] = [];
	status: number;
	code: string;

	constructor(status: number, response: string) {
		let errors;
		try {
			const parsedResponse = JSON.parse(response) as {
				errors: { code: string; message: string; data: unknown }[];
			};
			errors = parsedResponse.errors;
		} catch {
			// Ignore
		}
		const cause = errors?.[0] ? new Error(errors[0].message) : undefined;
		super(`Request to Enoki API failed (status: ${status})`, {
			cause,
		});
		this.errors = errors ?? [];
		this.name = 'EnokiClientError';
		this.status = status;
		this.code = errors?.[0]?.code ?? 'unknown_error';
	}

	/**
	 * True when the transaction must be built and signed again before retrying, because Enoki's
	 * sponsor address or the reference gas price changed since it was built.
	 */
	get requiresRebuild(): boolean {
		return this.code === 'invalid_gas_owner' || this.code === 'invalid_gas_price';
	}
}

/**
 * Whether a sponsorship failed because the transaction was built with a sponsor address or
 * reference gas price that's no longer current. Build it again, have the sender sign it, and retry.
 */
export function isStaleTransactionError(error: unknown): error is EnokiClientError {
	return error instanceof EnokiClientError && error.requiresRebuild;
}

/**
 * A low-level client for interacting with the Enoki API.
 */
export class EnokiClient {
	#version: string;
	#apiUrl: string;
	#apiKey: string;
	#additionalEpochs: number | undefined;

	constructor(config: EnokiClientConfig) {
		this.#version = 'v1';
		this.#apiUrl = config.apiUrl ?? DEFAULT_API_URL;
		this.#apiKey = config.apiKey;
		this.#additionalEpochs = config.additionalEpochs;
	}

	getApp(_input?: GetAppApiInput) {
		return this.#fetch<GetAppApiResponse>('app', {
			method: 'GET',
		});
	}

	getZkLogin(input: GetZkLoginApiInput) {
		return this.#fetch<GetZkLoginApiResponse>('zklogin', {
			method: 'GET',
			headers: {
				[ZKLOGIN_HEADER]: input.jwt,
			},
		});
	}

	getZkLoginAddresses(input: GetZkLoginAddressesApiInput) {
		return this.#fetch<GetZkLoginAddressesApiResponse>('zklogin/addresses', {
			method: 'GET',
			headers: {
				[ZKLOGIN_HEADER]: input.jwt,
			},
		});
	}

	createZkLoginNonce(input: CreateZkLoginNonceApiInput) {
		return this.#fetch<CreateZkLoginNonceApiResponse>('zklogin/nonce', {
			method: 'POST',
			body: JSON.stringify({
				network: input.network,
				ephemeralPublicKey: input.ephemeralPublicKey.toSuiPublicKey(),
				additionalEpochs: input.additionalEpochs ?? this.#additionalEpochs,
			}),
		});
	}

	createZkLoginZkp(input: CreateZkLoginZkpApiInput) {
		return this.#fetch<CreateZkLoginZkpApiResponse>('zklogin/zkp', {
			method: 'POST',
			headers: {
				[ZKLOGIN_HEADER]: input.jwt,
			},
			body: JSON.stringify({
				network: input.network,
				ephemeralPublicKey: input.ephemeralPublicKey.toSuiPublicKey(),
				maxEpoch: input.maxEpoch,
				randomness: input.randomness,
			}),
		});
	}

	createSponsoredTransaction(input: CreateSponsoredTransactionApiInput) {
		return this.#fetch<CreateSponsoredTransactionApiResponse>('transaction-blocks/sponsor', {
			method: 'POST',
			headers: input.jwt
				? {
						[ZKLOGIN_HEADER]: input.jwt,
					}
				: {},
			body: JSON.stringify({
				sender: input.sender,
				network: input.network,
				transactionBlockKindBytes: input.transactionKindBytes,
				allowedAddresses: input.allowedAddresses,
				allowedMoveCallTargets: input.allowedMoveCallTargets,
			}),
		});
	}

	executeSponsoredTransaction(input: ExecuteSponsoredTransactionApiInput) {
		return this.#fetch<ExecuteSponsoredTransactionApiResponse>(
			`transaction-blocks/sponsor/${input.digest}`,
			{
				method: 'POST',
				body: JSON.stringify({
					signature: input.signature,
				}),
			},
		);
	}

	/**
	 * Sponsors and executes a transaction in one request. Build it with the sponsor address from
	 * `getApp` as gas owner and an empty gas payment, and have the sender sign it. Requires a private
	 * API key.
	 *
	 * On `invalid_gas_owner` or `invalid_gas_price`, rebuild with the value in the error's `data`,
	 * sign again and retry. `already_sponsored` means Enoki has already sponsored this transaction.
	 */
	sponsorAndExecuteTransaction(input: SponsorAndExecuteTransactionApiInput) {
		return this.#fetch<SponsorAndExecuteTransactionApiResponse>(
			'transaction-blocks/sponsor/execute',
			{
				method: 'POST',
				body: JSON.stringify({
					network: input.network,
					transactionBytes: input.transactionBytes,
					signature: input.signature,
					allowedAddresses: input.allowedAddresses,
					allowedMoveCallTargets: input.allowedMoveCallTargets,
				}),
			},
		);
	}

	getSubnames(input: GetSubnamesApiInput) {
		const query = new URLSearchParams();
		if (input.address) {
			query.set('address', input.address);
		}
		if (input.network) {
			query.set('network', input.network);
		}
		if (input.domain) {
			query.set('domain', input.domain);
		}
		return this.#fetch<GetSubnamesApiResponse>(
			'subnames' + (query.size > 0 ? `?${query.toString()}` : ''),
			{
				method: 'GET',
			},
		);
	}

	createSubname(input: CreateSubnameApiInput) {
		return this.#fetch<CreateSubnameApiResponse>('subnames', {
			method: 'POST',
			headers: input.jwt
				? {
						[ZKLOGIN_HEADER]: input.jwt,
					}
				: {},
			body: JSON.stringify({
				network: input.network,
				domain: input.domain,
				subname: input.subname,
				targetAddress: input.targetAddress,
			}),
		});
	}

	deleteSubname(input: DeleteSubnameApiInput) {
		this.#fetch<DeleteSubnameApiResponse>('subnames', {
			method: 'DELETE',
			body: JSON.stringify({
				network: input.network,
				domain: input.domain,
				subname: input.subname,
			}),
		});
	}

	async #fetch<T = unknown>(path: string, init: RequestInit): Promise<T> {
		const res = await fetch(`${this.#apiUrl}/${this.#version}/${path}`, {
			...init,
			headers: {
				...init.headers,
				Authorization: `Bearer ${this.#apiKey}`,
				'Content-Type': 'application/json',
				'Request-Id': crypto.randomUUID(),
			},
		});

		if (!res.ok) {
			throw new EnokiClientError(res.status, await res.text());
		}

		const { data } = await res.json();

		return data as T;
	}
}
