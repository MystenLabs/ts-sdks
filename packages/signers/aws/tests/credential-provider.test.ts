// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AwsKmsClient } from '../src/aws-client.js';

describe('AwsKmsClient credential handling', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('throws when neither static credentials nor a provider are supplied', () => {
		expect(() => new AwsKmsClient({ region: 'us-east-1' })).toThrow(/credentials/i);
	});

	it('accepts a credential provider without static credentials', () => {
		expect(
			() =>
				new AwsKmsClient({
					region: 'us-east-1',
					credentials: async () => ({ accessKeyId: 'AKID', secretAccessKey: 'SECRET' }),
				}),
		).not.toThrow();
	});

	it('remains backwards compatible with static credentials', () => {
		expect(
			() =>
				new AwsKmsClient({
					region: 'us-east-1',
					accessKeyId: 'AKID',
					secretAccessKey: 'SECRET',
				}),
		).not.toThrow();
	});

	it('resolves the credential provider before every request (enables refresh)', async () => {
		const provider = vi.fn(async () => ({
			accessKeyId: 'AKID',
			secretAccessKey: 'SECRET',
			sessionToken: 'TOKEN',
		}));
		const fetchMock = vi.fn(
			async () => new Response(JSON.stringify({ KeyId: 'k' }), { status: 200 }),
		);
		vi.stubGlobal('fetch', fetchMock);

		const client = new AwsKmsClient({ region: 'us-east-1', credentials: provider });

		await client.runCommand('GetPublicKey', { KeyId: 'k' });
		await client.runCommand('GetPublicKey', { KeyId: 'k' });

		// Re-resolved on each request — this is precisely what lets temporary credentials refresh.
		expect(provider).toHaveBeenCalledTimes(2);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('signs each concurrent request with its own resolved credentials (no shared-state race)', async () => {
		let counter = 0;
		const provider = vi.fn(async () => {
			const n = ++counter;
			// Yield so the other in-flight request can interleave between resolve and sign.
			await Promise.resolve();
			return { accessKeyId: `AKID${n}`, secretAccessKey: `SECRET${n}` };
		});

		const signedAccessKeyIds: string[] = [];
		const fetchMock = vi.fn(async (req: Request) => {
			const credential = (req.headers.get('authorization') ?? '').match(/Credential=([^/]+)\//);
			if (credential) signedAccessKeyIds.push(credential[1]);
			return new Response(JSON.stringify({ KeyId: 'k' }), { status: 200 });
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new AwsKmsClient({ region: 'us-east-1', credentials: provider });

		await Promise.all([
			client.runCommand('GetPublicKey', { KeyId: 'k' }),
			client.runCommand('GetPublicKey', { KeyId: 'k' }),
		]);

		// Each request must be signed with the distinct credentials resolved for it — not whichever
		// value the other concurrent request happened to resolve last into shared state.
		expect(signedAccessKeyIds.sort()).toEqual(['AKID1', 'AKID2']);
	});

	it('does not invoke a provider when static credentials are used', async () => {
		const fetchMock = vi.fn(
			async () => new Response(JSON.stringify({ KeyId: 'k' }), { status: 200 }),
		);
		vi.stubGlobal('fetch', fetchMock);

		const client = new AwsKmsClient({
			region: 'us-east-1',
			accessKeyId: 'AKID',
			secretAccessKey: 'SECRET',
		});

		await client.runCommand('GetPublicKey', { KeyId: 'k' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
