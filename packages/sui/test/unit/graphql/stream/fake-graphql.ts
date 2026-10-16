// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A scripted GraphQL server for ledger stream tests.
 *
 * `ledgerStreamState` is answered from `server.tip` and `server.first`. Every other operation is
 * answered from its script, in order, repeating the last answer:
 *
 *   server.on('scanEvents', page('events', [event(1)]), page('events', []));
 *   server.on('subscribeEvents', live('events', [event(2)], 'eof'), live('events', []));
 *
 * Cursors are opaque strings that say where they came from (`history:` or `live:`), so tests can
 * check which cursor a request resumed from.
 */

import { vi } from 'vitest';

import { SuiGraphQLClient } from '../../../../src/graphql/index.js';

type Family = 'checkpoints' | 'transactions' | 'events';
type Variables = Record<string, any>;

export interface SentRequest {
	operation: string;
	variables: Variables;
	signal: AbortSignal;
}

/** One response. A function may change server state (for example, advance the tip). */
export type Answer = (request: SentRequest) => Response | Promise<Response>;

export interface FakeServer {
	client: SuiGraphQLClient;
	/** Newest indexed checkpoint; null reports that nothing is indexed yet. */
	tip: number | null;
	/** Oldest retained checkpoint. */
	first: number;
	/**
	 * Oldest retained checkpoint of the index behind each filter field, where it differs from
	 * `first`. Without `filters`, the server answers the strictest of all of them.
	 */
	retention: Record<string, number>;
	requests: SentRequest[];
	on(operation: string, ...answers: Answer[]): FakeServer;
	/** Variables of every request for `operation`, in order. */
	sent(operation: string): Variables[];
}

export function fakeGraphQL(options: { tip?: number; first?: number } = {}): FakeServer {
	const scripts = new Map<string, Answer[]>();
	const server: FakeServer = {
		client: undefined as never,
		tip: options.tip ?? 10,
		first: options.first ?? 0,
		retention: {},
		requests: [],
		on(operation, ...answers) {
			scripts.set(operation, answers);
			return server;
		},
		sent: (operation) =>
			server.requests
				.filter((request) => request.operation === operation)
				.map((request) => request.variables),
	};
	const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
		const body = JSON.parse(String(init?.body));
		const operation = /(?:query|subscription)\s+(\w+)/.exec(body.query)![1];
		const request = { operation, variables: body.variables ?? {}, signal: init!.signal! };
		server.requests.push(request);
		if (operation === 'ledgerStreamState') return stateResponse(server, request.variables.filters);
		const script = scripts.get(operation);
		if (!script?.length) throw new Error(`Unexpected ${operation}`);
		const answer = script.length > 1 ? script.shift()! : script[0];
		return answer(request);
	});
	server.client = new SuiGraphQLClient({
		url: 'https://example.com/graphql',
		network: 'unknown',
		fetch,
	});
	return server;
}

function stateResponse(server: FakeServer, filters: string[] | undefined) {
	const floors = filters
		? filters.map((filter) => server.retention[filter] ?? server.first)
		: Object.values(server.retention);
	return Response.json({
		data: {
			chainIdentifier: 'chain',
			serviceConfig: {
				availableRange: {
					first: { sequenceNumber: Math.max(server.first, ...floors) },
					last: server.tip === null ? null : { sequenceNumber: server.tip },
				},
			},
		},
	});
}

// Answers

export const reply =
	(body: unknown): Answer =>
	() =>
		Response.json(body);

/** A network failure before any response. */
export const networkFailure: Answer = () => {
	throw new TypeError('fetch failed');
};

/** A response whose body fails while it is read. */
export const brokenBody: Answer = () =>
	new Response(
		new ReadableStream({
			start(controller) {
				controller.error(new TypeError('socket closed'));
			},
		}),
		{ headers: { 'content-type': 'application/json' } },
	);

export const httpStatus =
	(status: number): Answer =>
	() =>
		new Response('unavailable', { status });

/** Runs `effect` (such as advancing the tip), then answers. */
export function after(effect: () => void, answer: Answer): Answer {
	return (request) => {
		effect();
		return answer(request);
	};
}

export interface Edge {
	cursor: string;
	node: Record<string, any>;
}

/**
 * One history page. `cursor` overrides both page cursors (an opaque frontier). `viewedAt` is the
 * checkpoint the answering replica had indexed, when it is behind the reported tip.
 */
export function page(
	family: Family,
	edges: Edge[],
	options: { more?: boolean; cursor?: string; viewedAt?: number } = {},
): Answer {
	const more = options.more ?? false;
	return reply({
		data: {
			...(options.viewedAt !== undefined && { viewedAt: { sequenceNumber: options.viewedAt } }),
			[family]: {
				edges,
				pageInfo: {
					hasNextPage: more,
					hasPreviousPage: more,
					startCursor: options.cursor ?? edges[0]?.cursor ?? null,
					endCursor: options.cursor ?? edges.at(-1)?.cursor ?? null,
				},
			},
		},
	});
}

/**
 * One subscription connection: its edges, then how it ends. `hang` stays open until the client
 * closes it; `error` fails while reading the body.
 */
export function live(
	family: Family,
	edges: Edge[],
	end: 'eof' | 'hang' | 'error' = 'hang',
): Answer {
	const messages = edges.map((edge) => ({ data: { [family]: edge } }));
	return liveMessages(messages, end);
}

/** A subscription that sends raw GraphQL results, such as `{ errors }`. */
export function liveMessages(messages: unknown[], end: 'eof' | 'hang' | 'error' = 'hang'): Answer {
	return () => {
		const chunks = messages.map((message) =>
			new TextEncoder().encode(`event: next\ndata: ${JSON.stringify(message)}\n\n`),
		);
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				const chunk = chunks.shift();
				if (chunk) controller.enqueue(chunk);
				else if (end === 'eof') controller.close();
				else if (end === 'error') controller.error(new TypeError('socket closed'));
				// `hang`: leave the read pending until the client cancels.
			},
		});
		return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
	};
}

// Nodes

type Source = 'history' | 'live';

export function checkpoint(sequenceNumber: number, source: Source = 'history'): Edge {
	return {
		cursor: `${source}:checkpoint:${sequenceNumber}`,
		node: {
			sequenceNumber,
			digest: `digest${sequenceNumber}`,
			epoch: { epochId: 0 },
			timestamp: '2026-01-01T00:00:00Z',
		},
	};
}

export interface EventOptions {
	source?: Source;
	/** Defaults to `tx<checkpoint>`. */
	transaction?: string;
	/** false: the index has not assigned the transaction a checkpoint yet. */
	indexed?: boolean;
	sender?: string | null;
}

export function event(cp: number, index = 0, options: EventOptions = {}): Edge {
	const transaction = options.transaction ?? `tx${cp}`;
	return {
		cursor: `${options.source ?? 'history'}:event:${transaction}:${index}`,
		node: {
			sequenceNumber: index,
			transaction: {
				digest: transaction,
				effects: { checkpoint: options.indexed === false ? null : { sequenceNumber: cp } },
			},
			transactionModule: { package: { address: '0x2' }, name: 'test' },
			sender:
				options.sender === null
					? null
					: { address: options.sender ?? `0x${'1'.padStart(64, '0')}` },
			contents: { type: { repr: '0x2::test::Event' }, bcs: '', json: { cp, index } },
		},
	};
}

export function transaction(
	cp: number,
	options: { source?: Source; digest?: string; indexed?: boolean; node?: Record<string, any> } = {},
): Edge {
	const digest = options.digest ?? `tx${cp}`;
	return {
		cursor: `${options.source ?? 'history'}:transaction:${digest}`,
		node: {
			digest,
			signatures: [],
			...options.node,
			effects: {
				status: 'SUCCESS',
				checkpoint: options.indexed === false ? null : { sequenceNumber: cp },
				...options.node?.effects,
			},
		},
	};
}

/** Answers `streamTransactionCheckpoints`: one entry per digest, null when not indexed. */
export function checkpointLookup(checkpoints: (number | null)[]): Answer {
	return reply({
		data: {
			multiGetTransactionEffects: checkpoints.map((cp) =>
				cp === null ? null : { checkpoint: { sequenceNumber: cp } },
			),
		},
	});
}
