// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { literal, object, parse } from 'valibot';

import { isValidSuiAddress, normalizeSuiAddress } from '../utils/sui-types.js';
import { FaucetRateLimitError } from './faucet.js';
import {
	FaucetAddress,
	FaucetAmount,
	FaucetChallenge,
	FaucetDifficulty,
	FaucetDigest,
	solveFaucetChallenge,
} from './pow.js';

export interface FaucetResponseV3 {
	status: 'success';
	digest: string;
	recipient: string;
	amountMist: string;
	difficulty: string;
}

/** A faucet HTTP error. Resolve any transaction digest before requesting another payout. */
export class FaucetError extends Error {
	readonly status: number;
	readonly code?: string;
	readonly digest?: string;

	constructor(message: string, options: { status: number; code?: string; digest?: string }) {
		super(message);
		this.name = 'FaucetError';
		this.status = options.status;
		this.code = options.code;
		this.digest = options.digest;
	}
}

const FaucetResponse = object({
	status: literal('success'),
	digest: FaucetDigest,
	recipient: FaucetAddress,
	amountMist: FaucetAmount,
	difficulty: FaucetDifficulty,
});

/**
 * Request SUI from a PoW faucet on devnet, testnet, or localnet.
 * Fetches and solves a challenge, then submits one payout request without retrying it.
 */
export async function requestSuiFromFaucetV3(input: {
	host: string;
	recipient: string;
	headers?: HeadersInit;
	signal?: AbortSignal;
	/** Maximum time for fetching, solving, and submitting, in milliseconds. Defaults to 180000. */
	timeout?: number;
}): Promise<FaucetResponseV3> {
	const recipient = normalizeSuiAddress(input.recipient);
	if (!isValidSuiAddress(recipient)) throw new Error('Invalid faucet recipient');
	const timeout = AbortSignal.timeout(input.timeout ?? 180_000);
	const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
	const headers = new Headers(input.headers);
	headers.set('Content-Type', 'application/json');

	async function request(path: string, body?: object): Promise<unknown> {
		signal.throwIfAborted();
		const response = await fetch(new URL(path, input.host).toString(), {
			method: body ? 'POST' : 'GET',
			headers,
			body: body ? JSON.stringify(body) : undefined,
			signal,
		});
		if (response.status === 429) {
			throw new FaucetRateLimitError('Too many requests to the faucet. Please retry later.');
		}
		const result = await response.json().catch((cause: unknown) => {
			signal.throwIfAborted();
			throw new Error(`Invalid faucet response (HTTP ${response.status})`, { cause });
		});
		if (!response.ok) {
			throw new FaucetError(
				typeof result?.error === 'string'
					? result.error
					: `Faucet request failed (HTTP ${response.status})`,
				{
					status: response.status,
					code: typeof result?.code === 'string' ? result.code : undefined,
					digest: typeof result?.digest === 'string' ? result.digest : undefined,
				},
			);
		}
		return result;
	}

	for (;;) {
		const startedAt = Date.now();
		const challenge = parse(
			FaucetChallenge,
			await request(`/v3/challenge?${new URLSearchParams({ recipient })}`),
		);
		if (challenge.recipient !== recipient) throw new Error('Faucet challenge recipient mismatch');
		// Reserve part of the window for submission; refresh only before a payout has been attempted.
		const proof = await solveFaucetChallenge(
			challenge,
			startedAt + challenge.windowSeconds * 800,
			signal,
		);
		if (!proof) continue;
		const result = parse(
			FaucetResponse,
			await request('/v3/gas', {
				recipient,
				checkpointSeq: challenge.checkpointSeq,
				...proof,
			}),
		);
		if (result.recipient !== recipient) throw new Error('Faucet response recipient mismatch');
		return result;
	}
}
