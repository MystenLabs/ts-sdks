// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { PULL_SERVER_STREAMING } from '@mysten/sui/grpc/pull-transport';
import { afterAll, describe, expect, it } from 'vitest';

import { GrpcNodeTransport } from '../src/index.js';

// Reaches a public fullnode, so it only runs when `SUI_GRPC_NODE_LIVE` is set.
const baseUrl = process.env.SUI_GRPC_NODE_LIVE_URL ?? 'https://fullnode.testnet.sui.io:443';

describe.runIf(process.env.SUI_GRPC_NODE_LIVE)(`live node (${baseUrl})`, () => {
	const transport = new GrpcNodeTransport({ baseUrl });
	const client = new SuiGrpcClient({ network: 'testnet', transport });

	afterAll(() => transport.close());

	it('reads the service info', async () => {
		const { response } = await client.ledgerService.getServiceInfo({});

		expect(response.chainId).toBeTruthy();
		expect(response.checkpointHeight).toBeGreaterThan(0n);
	});

	it('streams a few checkpoints on demand', async () => {
		const { response } = await client.ledgerService.getServiceInfo({});
		const start = response.lowestAvailableCheckpoint ?? 0n;
		const method = client.ledgerService.methods.find((m) => m.name === 'ListCheckpoints')!;
		const call = transport[PULL_SERVER_STREAMING](method, {
			startCheckpoint: start,
			endCheckpoint: start + 5n,
			readMask: { paths: ['sequence_number', 'digest'] },
		});
		const sequence: bigint[] = [];
		for await (const frame of call.responses) {
			if (frame.checkpoint?.sequenceNumber !== undefined) {
				sequence.push(frame.checkpoint.sequenceNumber);
			}
		}

		expect(sequence).toEqual([0n, 1n, 2n, 3n, 4n].map((offset) => start + offset));
		expect((await call.status).code).toBe('OK');
	});

	it('runs a ledger stream', async () => {
		const { response } = await client.ledgerService.getServiceInfo({});
		const start = (response.checkpointHeight ?? 0n) - 100n;
		const frames = [];
		for await (const frame of client.streamCheckpoints({
			start: { checkpoint: String(start) },
			end: { checkpoint: String(start + 3n) },
		})) {
			frames.push(frame);
		}

		expect(frames.map((frame) => frame.checkpoint.sequenceNumber)).toEqual(
			[0n, 1n, 2n].map((offset) => String(start + offset)),
		);
	});
});
