// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { BinaryReader, WireType } from '@protobuf-ts/runtime';
import { fromBase64, toBase64 } from '@mysten/utils';

export interface LedgerCursor {
	cursor: string;
	family: 'checkpoints' | 'transactions' | 'events';
	kind: 'item' | 'boundary';
	checkpoint: string;
	transactionIndex?: string;
	eventIndex?: number;
	coveredCheckpoint?: string;
}

/** Decode the sui.rpc.cursor.v1 position, preserving item versus scan-boundary semantics. */
export function decodeLedgerCursor(
	input: string | Uint8Array,
	family?: LedgerCursor['family'],
): LedgerCursor {
	const bytes = typeof input === 'string' ? fromBase64(input) : input;
	const reader = new BinaryReader(bytes);
	let kind: number | undefined;
	let position:
		| {
				family: LedgerCursor['family'];
				checkpoint: string;
				transactionIndex?: string;
				eventIndex?: number;
		  }
		| undefined;
	const legacy: Record<number, string> = {};
	while (reader.pos < reader.len) {
		const [field, wire] = reader.tag();
		if (field >= 1 && field <= 5 && wire === WireType.Varint) {
			const value = reader.uint64().toString();
			if (field === 5) kind = Number(value);
			else legacy[field] = value;
		} else if (field >= 6 && field <= 8 && wire === WireType.LengthDelimited) {
			if (position) throw new Error('Ledger cursor has multiple positions');
			const nested = new BinaryReader(reader.bytes());
			const values: Record<number, string> = {};
			while (nested.pos < nested.len) {
				const [key, type] = nested.tag();
				if (key >= 1 && key <= 3 && type === WireType.Varint)
					values[key] = nested.uint64().toString();
				else nested.skip(type);
			}
			if (
				values[1] == null ||
				(field >= 7 && values[2] == null) ||
				(field === 8 && values[3] == null)
			) {
				throw new Error('Ledger cursor is missing position coordinates');
			}
			position = {
				family: field === 6 ? 'checkpoints' : field === 7 ? 'transactions' : 'events',
				checkpoint: values[1],
				transactionIndex: field >= 7 ? values[2] : undefined,
				eventIndex: field === 8 ? Number(values[3]) : undefined,
			};
		} else reader.skip(wire);
	}
	// Decode-only support for cursors minted before the explicit coordinate schema.
	if (kind == null && !position && legacy[3] != null && legacy[4] != null) {
		kind = Number(legacy[2]);
		const query = Number(legacy[1]);
		if (query >= 1 && query <= 3)
			position = {
				family: query === 1 ? 'checkpoints' : query === 2 ? 'transactions' : 'events',
				checkpoint: query === 1 ? legacy[4] : legacy[3],
				transactionIndex:
					query === 2 ? legacy[4] : query === 3 ? (BigInt(legacy[4]) >> 16n).toString() : undefined,
				eventIndex: query === 3 ? Number(BigInt(legacy[4]) & 65535n) : undefined,
			};
	}
	if (
		!position ||
		(kind !== 1 && kind !== 2) ||
		(family && family !== position.family) ||
		(position.eventIndex != null && position.eventIndex > 0xffffffff)
	) {
		throw new Error('Invalid ledger cursor');
	}
	return {
		cursor: typeof input === 'string' ? input : toBase64(input),
		...position,
		kind: kind === 1 ? 'item' : 'boundary',
		// A boundary is the first position not scanned. Only earlier checkpoints are covered.
		coveredCheckpoint:
			kind === 2 && BigInt(position.checkpoint) > 0n
				? (BigInt(position.checkpoint) - 1n).toString()
				: undefined,
	};
}

export function compareLedgerCursors(a: string, b: string): number {
	const left = decodeLedgerCursor(a);
	const right = decodeLedgerCursor(b, left.family);
	// Transaction coordinates are global; legacy index cursors may have checkpoint=0.
	const keys =
		left.family === 'checkpoints'
			? (['checkpoint'] as const)
			: left.family === 'transactions'
				? (['transactionIndex'] as const)
				: (['transactionIndex', 'eventIndex'] as const);
	for (const key of keys) {
		const x = BigInt(left[key]!);
		const y = BigInt(right[key]!);
		if (x !== y) return x < y ? -1 : 1;
	}
	return 0;
}
