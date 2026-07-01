// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Typed client for the `predict-server` indexer HTTP API. Endpoints are historical /
// aggregated reads; point-in-time chain truth comes from the on-chain query classes.
//
// Numeric note: the server encodes monetary/share/NAV values as arbitrary-precision
// JSON numbers (Rust `BigDecimal`). Parsed via `JSON.parse` they become JS `number`
// and lose precision above 2^53. They are typed `number` here; a precision-preserving
// parse is a follow-up. i64 fields (checkpoints, ms timestamps, 1e9 ratios) are safe.
//
// Pagination is time-window + limit only (no cursor): `startTime`/`endTime` are unix
// SECONDS; `limit` defaults to 50 and is clamped to [1, 500].

export type FetchLike = (
	input: string,
	init?: { signal?: AbortSignal },
) => Promise<{
	ok: boolean;
	status: number;
	statusText: string;
	json: () => Promise<unknown>;
}>;

export interface IndexerClientOptions {
	baseUrl: string;
	/** Custom fetch (defaults to the global `fetch`); useful for tests / custom transports. */
	fetch?: FetchLike;
}

/** Time-window + limit params shared by list endpoints. `startTime`/`endTime` are unix seconds. */
export interface TimeWindow {
	startTime?: number;
	endTime?: number;
	limit?: number;
}

export interface StatusResponse {
	status: 'OK' | 'UNHEALTHY';
	latest_onchain_checkpoint: number;
	current_time_ms: number;
	earliest_checkpoint: number;
	max_lag_pipeline: string;
	pipelines: Array<{
		pipeline: string;
		indexed_checkpoint: number;
		indexed_timestamp_ms: number;
		checkpoint_lag: number;
		time_lag_seconds: number;
		is_backfill: boolean;
	}>;
}

export interface MarketCreated {
	kind: 'market_created';
	expiry_market_id: string;
	pool_vault_id: string;
	propbook_underlying_id: number;
	expiry: number;
	tick_size: number;
}

export interface PredictManagerCreated {
	kind: 'predict_manager_created';
	predict_manager_id: string;
	balance_manager_id: string;
	owner: string;
}

/** A maintained current-state position row (`order_state`). `status` ∈ open|replaced|closed|liquidated|liquidated_redeemed|settled_redeemed. */
export interface OrderState {
	kind: 'order_state';
	expiry_market_id: string;
	order_id: string;
	predict_manager_id: string | null;
	position_root_id: string | null;
	owner: string | null;
	status: string;
	replacement_order_id: string | null;
	opened_at_ms: number;
	lower_boundary_index: number;
	higher_boundary_index: number;
	floor_shares: number;
	quantity: number;
	sequence: number;
	leverage: number | null;
	entry_probability: number | null;
	net_premium: number | null;
	updated_at_ms: number;
}

/** A maintained current-state LP request row (`lp_request_state`). `status` ∈ open|cancelled|filled. */
export interface LpRequestState {
	kind: 'lp_request_state';
	pool_vault_id: string;
	is_supply: boolean;
	request_index: number;
	predict_manager_id: string | null;
	recipient: string | null;
	requested_amount: number | null;
	status: string;
	filled_dusdc: number | null;
	filled_shares: number | null;
	opened_at_ms: number;
	updated_at_ms: number;
}

export interface FlushExecuted {
	kind: 'flush_executed';
	pool_vault_id: string;
	epoch: number;
	pool_value: number;
	total_supply: number;
	active_market_nav: number;
	market_count: number;
	idle_balance_before: number;
	supplies_filled: number;
	withdrawals_filled: number;
	requests_processed: number;
	idle_balance_after: number;
}

export interface MarketOpenInterest {
	expiry_market_id: string;
	open_order_count: number;
	open_quantity: string;
	open_floor_shares: string;
}

/** A raw indexed event row; discriminate union feeds on `kind`. */
export type IndexerEvent = { kind: string } & Record<string, unknown>;

const STATUS_FILTER = 'open';

export class IndexerClient {
	#baseUrl: string;
	#fetch: FetchLike;

	constructor(options: IndexerClientOptions) {
		this.#baseUrl = options.baseUrl.replace(/\/+$/, '');
		this.#fetch = options.fetch ?? (globalThis.fetch as unknown as FetchLike);
	}

	async #get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
		const search = new URLSearchParams();
		if (query) {
			for (const [key, value] of Object.entries(query)) {
				if (value !== undefined) {
					search.set(key, String(value));
				}
			}
		}
		const qs = search.toString();
		const url = `${this.#baseUrl}${path}${qs ? `?${qs}` : ''}`;
		const res = await this.#fetch(url);
		if (!res.ok) {
			throw new Error(`predict-server ${path} failed: ${res.status} ${res.statusText}`);
		}
		return (await res.json()) as T;
	}

	#window(w?: TimeWindow): Record<string, number | undefined> {
		return { start_time: w?.startTime, end_time: w?.endTime, limit: w?.limit };
	}

	getStatus(params?: {
		maxCheckpointLag?: number;
		maxTimeLagSeconds?: number;
	}): Promise<StatusResponse> {
		return this.#get('/status', {
			max_checkpoint_lag: params?.maxCheckpointLag,
			max_time_lag_seconds: params?.maxTimeLagSeconds,
		});
	}

	listMarkets(window?: TimeWindow): Promise<MarketCreated[]> {
		return this.#get('/markets', this.#window(window));
	}

	getMarketOrders(marketId: string, window?: TimeWindow): Promise<IndexerEvent[]> {
		return this.#get(`/markets/${marketId}/orders`, this.#window(window));
	}

	getMarketState(marketId: string): Promise<Record<string, unknown>> {
		return this.#get(`/markets/${marketId}/state`);
	}

	getMarketOpenInterest(marketId: string): Promise<MarketOpenInterest> {
		return this.#get(`/markets/${marketId}/open-interest`);
	}

	getManagers(params?: { owner?: string } & TimeWindow): Promise<PredictManagerCreated[]> {
		return this.#get('/managers', { owner: params?.owner, ...this.#window(params) });
	}

	getManagerOrders(managerId: string, window?: TimeWindow): Promise<IndexerEvent[]> {
		return this.#get(`/managers/${managerId}/orders`, this.#window(window));
	}

	getManagerPositions(
		managerId: string,
		params?: { status?: string } & TimeWindow,
	): Promise<OrderState[]> {
		return this.#get(`/managers/${managerId}/positions`, {
			status: params?.status ?? STATUS_FILTER,
			...this.#window(params),
		});
	}

	getManagerLpRequests(
		managerId: string,
		params?: { status?: string } & TimeWindow,
	): Promise<LpRequestState[]> {
		return this.#get(`/managers/${managerId}/lp-requests`, {
			status: params?.status ?? STATUS_FILTER,
			...this.#window(params),
		});
	}

	getVaultFlushes(vaultId: string, window?: TimeWindow): Promise<FlushExecuted[]> {
		return this.#get(`/vaults/${vaultId}/flushes`, this.#window(window));
	}

	getVaultState(vaultId: string): Promise<Record<string, unknown>> {
		return this.#get(`/vaults/${vaultId}/state`);
	}
}
