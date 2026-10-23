// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { MethodInfo, RpcOptions, RpcTransport } from '@protobuf-ts/runtime-rpc';
import { RpcOutputStreamController, ServerStreamingCall } from '@protobuf-ts/runtime-rpc';
import { describe, expect, it } from 'vitest';

import { GrpcTypes, SuiGrpcClient } from '../../../../src/grpc/index.js';
import { collect, noDelay, statusLog } from '../../client/stream/fake-ledger.js';
import { checkpointFrame, ended, FakeLedger, mark } from './fake-grpc.js';

/**
 * A ledger that has not indexed its first checkpoint for `emptyReads` indexed-tip reads, like a
 * network that just started. This cannot happen in the e2e suite, which starts after genesis.
 */
function newChain(ledger: FakeLedger, emptyReads: number): RpcTransport {
	let remaining = emptyReads;
	return {
		mergeOptions: (options) => ledger.mergeOptions(options),
		unary: ledger.unary.bind(ledger),
		clientStreaming: ledger.clientStreaming.bind(ledger),
		duplex: ledger.duplex.bind(ledger),
		serverStreaming<I extends object, O extends object>(
			method: MethodInfo<I, O>,
			input: I,
			options: RpcOptions,
		) {
			const { options: query } = input as GrpcTypes.ListCheckpointsRequest;
			const tipRead =
				method.name === 'ListCheckpoints' &&
				query?.limit === 1 &&
				query.ordering === GrpcTypes.Ordering.DESCENDING;
			if (!tipRead || remaining === 0) return ledger.serverStreaming(method, input, options);
			remaining--;
			const responses = new RpcOutputStreamController<O>();
			queueMicrotask(() => {
				responses.notifyMessage({
					watermark: { cursor: mark('nothing-indexed') },
					end: { reason: GrpcTypes.QueryEndReason.LEDGER_TIP },
				} as O);
				responses.notifyComplete();
			});
			return new ServerStreamingCall(
				method,
				{},
				input,
				Promise.resolve({}),
				responses,
				Promise.resolve({ code: 'OK', detail: '' }),
				Promise.resolve({}),
			);
		},
	};
}

describe('gRPC ledger streams on a brand-new chain', () => {
	it('waits for the first indexed checkpoint before planning a finite range', async () => {
		const ledger = new FakeLedger('push').tip(1);
		ledger.list('ListCheckpoints', [
			checkpointFrame(0),
			checkpointFrame(1),
			ended('CHECKPOINT_BOUND', 1),
		]);
		const client = new SuiGrpcClient({ network: 'testnet', transport: newChain(ledger, 2) });
		const { log, onStatus } = statusLog();
		const frames = await collect(
			client.streamCheckpoints({
				start: { checkpoint: 0 },
				follow: false,
				retry: noDelay,
				onStatus,
			}),
		);
		expect(frames.map((frame) => frame.checkpoint.sequenceNumber)).toEqual(['0', '1']);
		// Two empty tip reads are retried before the range is planned at the first indexed tip.
		expect(log.filter((status) => status.startsWith('Retrying'))).toHaveLength(2);
		expect(log.at(-1)).toBe('Page(history,bound)');
		expect(ledger.requestsTo('ListCheckpoints')[0]).toMatchObject({ endCheckpoint: 2n });
	});
});
