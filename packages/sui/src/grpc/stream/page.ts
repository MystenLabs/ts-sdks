// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { base64decode } from '@protobuf-ts/runtime';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';

import type { Page, PageRequest } from '../../client/stream/index.js';
import { SuiStreamError } from '../../client/stream/index.js';
import { ErrorInfo } from '../proto/google/rpc/error_details.js';
import { Status } from '../proto/google/rpc/status.js';
import { Ordering, QueryEndReason } from '../proto/sui/rpc/v2/query_options.js';
import { openLedgerCall, type LedgerCall } from './call.js';
import {
	GRPC_FAMILIES,
	type GrpcFamily,
	type GrpcItem,
	type ListFrame,
	type ListRequest,
	watermarkPosition,
} from './families.js';

/** Servers clamp larger limits to their own maximum for each method. */
const PAGE_LIMIT = 1000;

/** A List request without the stream's filter and read mask. */
export type ListQuery = Omit<ListRequest, 'readMask' | 'filter'>;

/**
 * One List call as a page. The call streams its items and ends with a QueryEnd frame, whose
 * watermark says where the scan stopped. The call opens on the first read.
 */
export async function* fetchListPage(
	family: GrpcFamily,
	list: (query: ListQuery, signal: AbortSignal) => LedgerCall<ListFrame>,
	request: PageRequest,
): Page<GrpcItem> {
	const { order, range } = request;
	const call = list(listQuery(request), request.signal);
	let end: ListFrame | undefined;
	try {
		for await (const frame of call) {
			const item = family.item(frame);
			if (frame.end) end = frame;
			if (item) yield { position: family.position(frame, item), item };
			// A filtered scan reports its frontier between items.
			else if (!frame.end && frame.watermark)
				yield { position: watermarkPosition(frame.watermark) };
		}
	} catch (error) {
		if (!(error instanceof RpcError && error.code === 'OUT_OF_RANGE')) throw error;
		const marker = ledgerErrorInfo(error);
		if (marker?.reason === 'ABOVE_LATEST_AVAILABLE') {
			return { next: { more: false }, notIndexed: true };
		}
		const floor = marker?.metadata.lowestAvailableCheckpoint;
		// A descending read with no low end of its own stops at the floor, after its items.
		if (
			marker?.reason === 'BELOW_EARLIEST_AVAILABLE' &&
			order === 'descending' &&
			range.start === undefined &&
			/^\d+$/.test(floor ?? '')
		) {
			return { next: { more: false }, retainedFrom: BigInt(floor!) };
		}
		throw new SuiStreamError('HistoryUnavailable', error.message, { cause: error });
	} finally {
		await call.return();
	}
	const reason = end?.end?.reason;
	if (reason === undefined) throw protocol('List RPC completed without QueryEnd');
	if (reason === QueryEndReason.UNKNOWN || !(reason in QueryEndReason)) {
		throw protocol('Unknown QueryEnd reason');
	}

	const { watermark } = end!;
	const more = reason === QueryEndReason.ITEM_LIMIT || reason === QueryEndReason.SCAN_LIMIT;
	const checkpoint = watermark?.checkpoint;
	// An empty scan at the tip reports no checkpoint: nothing past the start is indexed yet, which
	// only a read with an end has to wait for.
	if (
		order === 'ascending' &&
		checkpoint === undefined &&
		reason === QueryEndReason.LEDGER_TIP &&
		range.end !== undefined
	) {
		return { next: { more: false }, notIndexed: true };
	}
	return {
		next: more
			? {
					more,
					cursor: watermark?.cursor,
					// An ITEM_LIMIT end is the last item's frame, which already placed the stream.
					...(reason === QueryEndReason.SCAN_LIMIT && { position: watermarkPosition(watermark) }),
				}
			: { more },
		covered: order === 'ascending' ? checkpoint : undefined,
		// Without a low end, a descending read stops at the oldest checkpoint the server keeps.
		retainedFrom:
			order === 'descending' && !more && range.start === undefined ? checkpoint : undefined,
	};
}

/** The indexed tip: the newest checkpoint a List call can read. */
export async function readIndexedTip(transport: RpcTransport, signal: AbortSignal) {
	const call = openLedgerCall(
		transport,
		GRPC_FAMILIES.checkpoints.list,
		{
			readMask: { paths: ['sequence_number'] },
			options: { limit: 1, ordering: Ordering.DESCENDING },
		},
		{ signal, isItem: (frame) => frame.checkpoint !== undefined },
	);
	try {
		for await (const frame of call) {
			const checkpoint = frame.checkpoint?.sequenceNumber;
			if (checkpoint !== undefined) return checkpoint;
		}
	} finally {
		await call.return();
	}
	// A new network has nothing indexed for a moment; retry.
	throw new RpcError('No checkpoint is indexed yet', 'UNAVAILABLE');
}

function listQuery({ range, after, before, order }: PageRequest): ListQuery {
	return {
		startCheckpoint: range.start,
		endCheckpoint: range.end,
		options: {
			limit: PAGE_LIMIT,
			ordering: order === 'ascending' ? Ordering.ASCENDING : Ordering.DESCENDING,
			after,
			before,
		},
	};
}

/** The `ErrorInfo` a server marks a ledger OUT_OF_RANGE with, if any. */
function ledgerErrorInfo(error: RpcError): ErrorInfo | undefined {
	const details = error.meta['grpc-status-details-bin'];
	const encoded = Array.isArray(details) ? details[0] : details;
	if (!encoded) return undefined;
	try {
		const status = Status.fromBinary(base64decode(encoded));
		// Servers send the type URL `/google.rpc.ErrorInfo`, with no host, which `Any.contains` rejects.
		const detail = status.details.find(
			({ typeUrl }) => typeUrl.slice(typeUrl.lastIndexOf('/') + 1) === ErrorInfo.typeName,
		);
		const info = detail && ErrorInfo.fromBinary(detail.value);
		return info?.domain === 'sui.io' ? info : undefined;
	} catch {
		return undefined;
	}
}

function protocol(message: string) {
	return new SuiStreamError('Protocol', message);
}
