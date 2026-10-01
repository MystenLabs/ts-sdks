// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { once } from 'node:events';
import { createServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	FaucetRateLimitError,
	FaucetError,
	getFaucetHost,
	requestSuiFromFaucetV2,
	requestSuiFromFaucetV3,
} from '../../../src/faucet/index.js';
import vectors from './pow-vectors.json' with { type: 'json' };

const challenge = {
	version: 1,
	domain: vectors.domain,
	salt: vectors.salt,
	algorithm: 'argon2d',
	argon2Version: 19,
	memorySize: 8192,
	iterations: 1,
	parallelism: 1,
	hashLength: 32,
	...vectors.inputs,
	difficulty: '2',
	threshold: '9223372036854775808',
	windowSeconds: 60,
	amountMist: '9007199254740993',
};
const payout = {
	status: 'success',
	digest: vectors.inputs.checkpointDigest,
	recipient: challenge.recipient,
	amountMist: challenge.amountMist,
	difficulty: challenge.difficulty,
};
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock);
	fetchMock.mockReset();
	vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
		(array as BigUint64Array)[0] = 0n;
		return array;
	});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('requestSuiFromFaucetV3', () => {
	it('completes a real HTTP challenge and proof submission against a local PoW faucet', async () => {
		vi.unstubAllGlobals();
		let submitted: unknown;
		const server = createServer(async (request, response) => {
			response.setHeader('Content-Type', 'application/json');
			if (request.url === `/v3/challenge?recipient=${challenge.recipient}`) {
				response.end(JSON.stringify(challenge));
				return;
			}
			if (request.url !== '/v3/gas' || request.method !== 'POST') {
				response.writeHead(404).end();
				return;
			}
			const chunks: Buffer[] = [];
			for await (const chunk of request) chunks.push(chunk);
			submitted = JSON.parse(Buffer.concat(chunks).toString());
			response.end(JSON.stringify(payout));
		});
		server.listen(0, '127.0.0.1');
		await once(server, 'listening');
		try {
			const address = server.address();
			if (!address || typeof address === 'string') throw new Error('Missing local server port');
			await expect(
				requestSuiFromFaucetV3({
					host: `http://127.0.0.1:${address.port}`,
					recipient: challenge.recipient,
				}),
			).resolves.toEqual(payout);
			expect(submitted).toEqual({
				recipient: challenge.recipient,
				checkpointSeq: challenge.checkpointSeq,
				nonce: '0',
				hashHex: vectors.cases[0].hash,
			});
		} finally {
			server.closeAllConnections();
			await new Promise<void>((resolve) => server.close(() => resolve()));
		}
	});

	it.each(['testnet', 'devnet', 'localnet'] as const)(
		'fetches a challenge and submits the complete proof on %s',
		async (network) => {
			fetchMock.mockResolvedValueOnce(Response.json(challenge));
			fetchMock.mockResolvedValueOnce(Response.json(payout));
			const host = getFaucetHost(network);
			const headers = new Headers({ 'x-api-key': 'test' });

			await expect(
				requestSuiFromFaucetV3({ host, recipient: challenge.recipient, headers }),
			).resolves.toEqual(payout);

			expect(fetchMock).toHaveBeenCalledTimes(2);
			expect(String(fetchMock.mock.calls[0][0])).toBe(
				`${host}/v3/challenge?recipient=${challenge.recipient}`,
			);
			const [url, init] = fetchMock.mock.calls[1];
			expect(String(url)).toBe(`${host}/v3/gas`);
			expect(init?.method).toBe('POST');
			expect(JSON.parse(init?.body as string)).toEqual({
				recipient: challenge.recipient,
				checkpointSeq: challenge.checkpointSeq,
				nonce: '0',
				hashHex: vectors.cases[0].hash,
			});
			for (const [, options] of fetchMock.mock.calls) {
				expect(new Headers(options?.headers).get('x-api-key')).toBe('test');
				expect(options?.signal).toBeInstanceOf(AbortSignal);
			}
		},
	);

	it('normalizes a short recipient before requesting and hashing', async () => {
		const recipient = `0x${'0'.repeat(63)}2`;
		fetchMock.mockResolvedValueOnce(Response.json({ ...challenge, recipient }));
		fetchMock.mockResolvedValueOnce(Response.json({ ...payout, recipient }));
		await requestSuiFromFaucetV3({ host: getFaucetHost('localnet'), recipient: '0x2' });
		expect(String(fetchMock.mock.calls[0][0])).toContain(`recipient=${recipient}`);
		expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string).recipient).toBe(recipient);
	});

	it.each([
		{ version: 2 },
		{ memorySize: 1 << 30 },
		{ algorithm: 'argon2id' },
		{ recipient: `0x${'2'.repeat(64)}` },
		{ difficulty: '0' },
		{ difficulty: '01' },
		{ threshold: '1' },
		{ checkpointSeq: '18446744073709551616' },
		{ chainId: 'bad\nchain' },
		{ randomBytes: 'bad\nrandomness' },
		{ windowSeconds: 0 },
		{ amountMist: '0' },
	])('rejects an invalid challenge before submission: %j', async (fields) => {
		fetchMock.mockResolvedValueOnce(Response.json({ ...challenge, ...fields }));
		await expect(
			requestSuiFromFaucetV3({
				host: getFaucetHost('testnet'),
				recipient: challenge.recipient,
			}),
		).rejects.toThrow();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it.each(['payout_status_unknown', 'already_used', 'stale_checkpoint', 'invalid_proof'])(
		'preserves %s errors and never retries a payout',
		async (code) => {
			fetchMock.mockResolvedValueOnce(Response.json(challenge));
			fetchMock.mockResolvedValueOnce(
				Response.json(
					{
						code,
						error: 'payout could not be confirmed',
						digest: payout.digest,
					},
					{ status: 409 },
				),
			);
			const error = await requestSuiFromFaucetV3({
				host: getFaucetHost('testnet'),
				recipient: challenge.recipient,
			}).catch((error: unknown) => error);
			expect(error).toBeInstanceOf(FaucetError);
			expect(error).toMatchObject({ code, status: 409, digest: payout.digest });
			expect(fetchMock).toHaveBeenCalledTimes(2);
		},
	);

	it('preserves rate-limit errors', async () => {
		fetchMock.mockResolvedValueOnce(new Response('Too many requests', { status: 429 }));
		await expect(
			requestSuiFromFaucetV3({
				host: getFaucetHost('testnet'),
				recipient: challenge.recipient,
			}),
		).rejects.toBeInstanceOf(FaucetRateLimitError);
	});

	it('does not retry a failed POST connection', async () => {
		fetchMock.mockResolvedValueOnce(Response.json(challenge));
		fetchMock.mockRejectedValueOnce(new TypeError('connection lost'));
		await expect(
			requestSuiFromFaucetV3({
				host: getFaucetHost('testnet'),
				recipient: challenge.recipient,
			}),
		).rejects.toThrow('connection lost');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('rejects a malformed success response', async () => {
		fetchMock.mockResolvedValueOnce(Response.json(challenge));
		fetchMock.mockResolvedValueOnce(Response.json({ ...payout, amountMist: 1 }));
		await expect(
			requestSuiFromFaucetV3({
				host: getFaucetHost('testnet'),
				recipient: challenge.recipient,
			}),
		).rejects.toThrow();
	});

	it('refreshes an expired challenge before attempting a payout', async () => {
		vi.spyOn(Date, 'now').mockReturnValueOnce(0);
		fetchMock.mockResolvedValueOnce(Response.json(challenge));
		fetchMock.mockResolvedValueOnce(Response.json(challenge));
		fetchMock.mockResolvedValueOnce(Response.json(payout));
		await expect(
			requestSuiFromFaucetV3({
				host: getFaucetHost('testnet'),
				recipient: challenge.recipient,
			}),
		).resolves.toEqual(payout);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual(['GET', 'GET', 'POST']);
	});

	it('bounds a stalled HTTP request by the timeout', async () => {
		fetchMock.mockImplementation(
			(_url, init) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), {
						once: true,
					});
				}),
		);
		await expect(
			requestSuiFromFaucetV3({
				host: getFaucetHost('testnet'),
				recipient: challenge.recipient,
				timeout: 5,
			}),
		).rejects.toMatchObject({ name: 'TimeoutError' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('honors cancellation before making any request', async () => {
		await expect(
			requestSuiFromFaucetV3({
				host: getFaucetHost('testnet'),
				recipient: challenge.recipient,
				signal: AbortSignal.abort(),
			}),
		).rejects.toMatchObject({ name: 'AbortError' });
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe('requestSuiFromFaucetV2', () => {
	it('keeps local no-PoW requests unchanged', async () => {
		const response = { status: 'Success', coins_sent: [] };
		fetchMock.mockResolvedValueOnce(Response.json(response));
		await expect(
			requestSuiFromFaucetV2({
				host: getFaucetHost('localnet'),
				recipient: challenge.recipient,
			}),
		).resolves.toEqual(response);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:9123/v2/gas');
		expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
			FixedAmountRequest: { recipient: challenge.recipient },
		});
	});
});
