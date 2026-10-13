// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs, type BcsType, type InferBcsType, type InferBcsInput } from '@mysten/bcs';
import { fromBase64, toBase64 } from '@mysten/utils';
import { check, parse, pipe, string } from 'valibot';

const TOKEN_PREFIX = 'sui-stream:';
const BoundaryValue = pipe(
	string(),
	check((value) => BigInt(value) <= 1n << 64n),
);
// The exclusive boundary after the largest checkpoint is one greater than a u64.
const Boundary = bcs.u128().transform({
	input: (value: string) => parse(BoundaryValue, value),
	output: (value) => parse(BoundaryValue, value),
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

export const GrpcPosition = bcs.struct('GrpcStreamPosition', {
	cursor: GrpcCursor,
	checkpoint: bcs.option(bcs.u64()),
	coveredCheckpoint: bcs.option(bcs.u64()),
	/** Boundary immediately before this checkpoint, proven by a terminal scan. */
	checkpointBoundary: bcs.option(Boundary),
	transactionIndex: bcs.option(bcs.u64()),
	eventIndex: bcs.option(bcs.u32()),
});
export const GraphQLPosition = bcs.struct('GraphQLStreamPosition', {
	cursor: bcs.string(),
	checkpoint: bcs.option(bcs.u64()),
	/** Public item identity used to verify an exclusive endpoint. */
	itemId: bcs.option(bcs.string()),
	/** Checkpoint known to be indexed when this cursor was received. */
	indexedCheckpoint: bcs.option(bcs.u64()),
});

export function tokenPayload<Position, Input>(position: BcsType<Position, Input>) {
	return bcs.struct('StreamTokenPayload', {
		family: bcs.enum('StreamFamily', { checkpoints: null, transactions: null, events: null }),
		chain: bcs.string(),
		filter: bcs.bytes(32),
		position,
		range: bcs.enum('StreamRange', {
			Follow: null,
			Finite: bcs.struct('FiniteStreamRange', {
				order: bcs.enum('StreamOrder', { ascending: null, descending: null }),
				capturedTip: bcs.option(bcs.u64()),
				end: bcs.enum('StreamEnd', {
					Checkpoint: Boundary,
					Cursor: position,
					IndexedTip: bcs.u64(),
					Genesis: null,
				}),
			}),
		}),
	});
}

export const Token = bcs.enum('StreamToken', {
	V1: bcs.enum('StreamTransport', {
		grpc: tokenPayload(GrpcPosition),
		graphql: tokenPayload(GraphQLPosition),
	}),
});

export type GrpcStreamPosition = InferBcsType<typeof GrpcPosition>;
export type GraphQLStreamPosition = InferBcsType<typeof GraphQLPosition>;

export type StreamToken = InferBcsType<typeof Token>;

export function encodeToken(token: InferBcsInput<typeof Token>): string {
	return TOKEN_PREFIX + Token.serialize(token).toBase64();
}

export function decodeToken(value: string): StreamToken {
	try {
		if (!value.startsWith(TOKEN_PREFIX)) throw new Error();
		return Token.parse(fromBase64(value.slice(TOKEN_PREFIX.length)));
	} catch {
		throw new Error('Invalid or unsupported stream resume token');
	}
}
