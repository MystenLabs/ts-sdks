// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { GrpcWebFetchTransport, SuiGrpcClient } from '../../../src/grpc/index.js';
import type { GrpcWebOptions } from '../../../src/grpc/index.js';

type Format = GrpcWebOptions['format'];
type FormatOption = { format?: Format };

function recordingFetch() {
	const sent: { contentType: string | null } = { contentType: null };
	const fetch = (async (_input: unknown, init: RequestInit) => {
		sent.contentType = new Headers(init.headers).get('content-type');
		return new Response(null, {
			status: 200,
			headers: { 'content-type': 'application/grpc-web+proto', 'grpc-status': '5' },
		});
	}) as unknown as typeof globalThis.fetch;
	return { sent, fetch };
}

async function clientContentType(formatOption: FormatOption) {
	const { sent, fetch } = recordingFetch();
	const client = new SuiGrpcClient({
		baseUrl: 'http://localhost',
		network: 'testnet',
		...formatOption,
		fetch,
	});

	await client.ledgerService.getServiceInfo({}).response.catch(() => {});

	return sent.contentType;
}

async function transportContentType(formatOption: FormatOption) {
	const { sent, fetch } = recordingFetch();
	const transport = new GrpcWebFetchTransport({
		baseUrl: 'http://localhost',
		...formatOption,
		fetch,
	});
	const client = new SuiGrpcClient({ network: 'testnet', transport });

	await client.ledgerService.getServiceInfo({}).response.catch(() => {});

	return sent.contentType;
}

describe.each([
	['SuiGrpcClient', clientContentType],
	['GrpcWebFetchTransport built directly', transportContentType],
])('%s gRPC-web wire format', (_name, contentType) => {
	it('defaults to binary framing', async () => {
		expect(await contentType({})).toBe('application/grpc-web+proto');
	});

	it('defaults to binary framing when format is explicitly undefined', async () => {
		expect(await contentType({ format: undefined })).toBe('application/grpc-web+proto');
	});

	it('uses binary framing when format is binary', async () => {
		expect(await contentType({ format: 'binary' })).toBe('application/grpc-web+proto');
	});

	it('uses base64 text framing when format is text', async () => {
		expect(await contentType({ format: 'text' })).toBe('application/grpc-web-text');
	});
});
