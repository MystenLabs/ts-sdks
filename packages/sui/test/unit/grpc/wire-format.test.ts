// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { GrpcWebFetchTransport, SuiGrpcClient } from '../../../src/grpc/index.js';
import type { GrpcWebOptions } from '../../../src/grpc/index.js';
import { recordingFetch } from './recording-fetch.js';

type Format = GrpcWebOptions['format'];
type FormatOption = { format?: Format };

function recordContentType() {
	const sent: { contentType: string | null } = { contentType: null };
	const fetch = recordingFetch((init) => {
		sent.contentType = new Headers(init.headers).get('content-type');
	});
	return { sent, fetch };
}

async function clientContentType(formatOption: FormatOption) {
	const { sent, fetch } = recordContentType();
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
	const { sent, fetch } = recordContentType();
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

	it('uses base64 text framing when format is text', async () => {
		expect(await contentType({ format: 'text' })).toBe('application/grpc-web-text');
	});
});
