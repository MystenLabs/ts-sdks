// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs, type BcsType } from '@mysten/bcs';
import { fromBase64, toBase64 } from '@mysten/utils';
import { check, minLength, parse, pipe, string } from 'valibot';

import type { StreamBound, StreamPosition } from './stream.js';
import type { SuiClientTypes } from './types.js';

export interface StreamToken {
	transport: 'grpc' | 'graphql';
	family: 'checkpoints' | 'transactions' | 'events';
	chain: string;
	filter: string;
	order: SuiClientTypes.Order;
	position: StreamPosition;
	range: {
		end?: StreamBound;
		capturedTip?: string;
		follow: boolean;
		reason: SuiClientTypes.StreamCompletion['reason'];
	};
}

const TOKEN_PREFIX = 'sui-stream:';
const NonemptyString = bcs.string().transform({
	input: (value: string) => parse(pipe(string(), minLength(1)), value),
	output: (value) => parse(pipe(string(), minLength(1)), value),
});
const BoundaryValue = pipe(
	string(),
	check((value) => BigInt(value) <= 1n << 64n),
);
// The exclusive boundary after the largest checkpoint is one greater than a u64.
const Boundary = bcs.u128().transform({
	input: (value: string) => parse(BoundaryValue, value),
	output: (value) => parse(BoundaryValue, value),
});
const Checkpoint = bcs.u64().transform({
	input: (value: string) => value,
	output: (value) => value,
});
const CursorBytes = bcs.byteVector().transform({
	input: (value: string) => fromBase64(value),
	output: (value) => toBase64(value),
});
const GrpcCursor = bcs
	.enum('GrpcStreamCursor', {
		Native: CursorBytes,
		Checkpoint: bcs.u64(),
		Genesis: null,
	})
	.transform({
		input: (value: string) =>
			value === 'genesis'
				? { Genesis: true }
				: value.startsWith('checkpoint:')
					? { Checkpoint: value.slice('checkpoint:'.length) }
					: { Native: value },
		output: (value) => {
			switch (value.$kind) {
				case 'Native':
					return value.Native;
				case 'Checkpoint':
					return `checkpoint:${value.Checkpoint}`;
				case 'Genesis':
					return 'genesis';
			}
		},
	});

function optional<T, Input>(type: BcsType<T, Input>) {
	return bcs.option(type).transform({
		input: (value: Input | undefined) => value ?? null,
		output: (value) => value ?? undefined,
	});
}

const GrpcPosition = bcs
	.struct('GrpcStreamPosition', {
		cursor: GrpcCursor,
		checkpoint: optional(Checkpoint),
		coveredCheckpoint: optional(Checkpoint),
		checkpointBoundary: optional(Boundary),
		transactionIndex: optional(Checkpoint),
		eventIndex: optional(bcs.u32()),
	})
	.transform({
		input: (value: StreamPosition) => ({
			cursor: value.cursor,
			checkpoint: value.checkpoint,
			coveredCheckpoint: value.coveredCheckpoint,
			checkpointBoundary: value.checkpointBoundary,
			transactionIndex: value.transactionIndex,
			eventIndex: value.eventIndex,
		}),
		output: (value): StreamPosition => value,
	});
const GraphQLPosition = bcs
	.struct('GraphQLStreamPosition', {
		cursor: NonemptyString,
		checkpoint: optional(Checkpoint),
		itemId: optional(NonemptyString),
		indexedCheckpoint: optional(Checkpoint),
	})
	.transform({
		input: (value: StreamPosition) => ({
			cursor: value.cursor,
			checkpoint: value.checkpoint,
			itemId: value.itemId,
			indexedCheckpoint: value.indexedCheckpoint,
		}),
		output: (value): StreamPosition => value,
	});

function tokenPayload(position: BcsType<StreamPosition, StreamPosition>) {
	const range = bcs
		.struct('StreamRange', {
			capturedTip: optional(Checkpoint),
			end: bcs.enum('StreamEnd', {
				Follow: null,
				Checkpoint: Boundary,
				Cursor: position,
				IndexedTip: null,
				Genesis: null,
			}),
		})
		.transform({
			input: (value: StreamToken['range']) => ({
				capturedTip: value.capturedTip,
				end: value.follow
					? { Follow: true }
					: value.reason === 'indexedTip'
						? { IndexedTip: true }
						: value.reason === 'genesis'
							? { Genesis: true }
							: value.end && 'checkpoint' in value.end
								? { Checkpoint: value.end.checkpoint }
								: { Cursor: (value.end as { position: StreamPosition }).position },
			}),
			output: (value): StreamToken['range'] => {
				const shared = { capturedTip: value.capturedTip, follow: false };
				switch (value.end.$kind) {
					case 'Follow':
						return { ...shared, follow: true, reason: 'indexedTip' };
					case 'Checkpoint':
						return {
							...shared,
							end: { checkpoint: value.end.Checkpoint },
							reason: 'checkpointBound',
						};
					case 'Cursor':
						return { ...shared, end: { position: value.end.Cursor }, reason: 'cursorBound' };
					case 'IndexedTip':
						if (value.capturedTip === undefined) throw new Error('Missing captured tip');
						return {
							...shared,
							end: { checkpoint: (BigInt(value.capturedTip) + 1n).toString() },
							reason: 'indexedTip',
						};
					case 'Genesis':
						return { ...shared, reason: 'genesis' };
				}
			},
		});
	return bcs.struct('StreamTokenPayload', {
		family: bcs
			.enum('StreamFamily', { checkpoints: null, transactions: null, events: null })
			.transform({
				input: (value: StreamToken['family']) =>
					({ [value]: true }) as { checkpoints: true } | { transactions: true } | { events: true },
				output: (value) => value.$kind,
			}),
		chain: NonemptyString,
		filter: bcs
			.bytes(32)
			.transform({ input: (value: string) => fromBase64(value), output: toBase64 }),
		order: bcs.bool().transform({
			input: (value: SuiClientTypes.Order) => value === 'descending',
			output: (value): SuiClientTypes.Order => (value ? 'descending' : 'ascending'),
		}),
		position,
		range,
	});
}

const Token = bcs.enum('StreamToken', {
	V1: bcs.enum('StreamTransport', {
		grpc: tokenPayload(GrpcPosition),
		graphql: tokenPayload(GraphQLPosition),
	}),
});

export function encodeToken(token: StreamToken): string {
	return (
		TOKEN_PREFIX +
		Token.serialize({
			V1: token.transport === 'grpc' ? { grpc: token } : { graphql: token },
		}).toBase64()
	);
}

export function decodeToken(value: string): StreamToken {
	try {
		if (!value.startsWith(TOKEN_PREFIX) || value.length > 100_000) throw new Error();
		const bytes = fromBase64(value.slice(TOKEN_PREFIX.length));
		const decoded = Token.parse(bytes);
		// BCS readers can leave trailing bytes unread; require one canonical, complete value.
		const encoded = Token.serialize(decoded).toBytes();
		if (encoded.length !== bytes.length || encoded.some((byte, index) => byte !== bytes[index]))
			throw new Error();
		const transport = decoded.V1.$kind;
		const token = { transport, ...decoded.V1[transport]! };
		if (token.range.follow && token.order === 'descending') throw new Error();
		return token;
	} catch {
		throw new Error('Invalid or unsupported stream resume token');
	}
}
