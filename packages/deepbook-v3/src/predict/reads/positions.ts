import { bcs } from '@mysten/sui/bcs';
import type { ClientWithCoreApi } from '@mysten/sui/client';
import { deriveDynamicFieldID, normalizeSuiAddress } from '@mysten/sui/utils';
import { type GeneratedConfig } from '../config/generated.js';
import { deriveAccountWrapperIdFrom } from '../tx/common.js';
import { AccountWrapper } from '../../account.js';
import { PositionKey, PredictData } from '../../contracts/deepbook_predict/predict_account.js';

// ============================================================================
// Chain-only position enumeration.
//
// Every open position is tracked under the owner's account:
// `predict_account::PredictData.positions` is a
// `Table<PositionKey{expiry_market_id, order_id}, Position>` — and Table
// entries are dynamic fields, so the KEYS (everything redeem/claim need)
// arrive directly from a dynamic-field listing. No indexer, no simulation.
//
// The walk (all parsing is exact BCS via `include: {content: true}`; the account
// and PredictData struct layouts come from the generated `contracts/*` MoveStructs
// so they can't drift from the deployed `account`/`predict_account` sources):
//   1. wrapper object (id derived client-side)     → account UID
//   2. derived DataKey<PredictApp> field object     → positions Table id
//   3. listDynamicFields(table)                    → PositionKey per entry
// Steps 1-2 resolve ids that are immutable once created — cache them per
// owner (the facade does) and steady state is ONE call per page of positions.
// ============================================================================

// sui::dynamic_field::Field<DataKey<PredictApp>, PredictData>. DataKey is
// source-empty, but Move inserts a hidden `dummy_field: bool` into empty
// structs — so the name occupies ONE zero byte between id and value (and the
// same byte is the derived-field key, below). The `value` uses the generated
// `PredictData` layout so it tracks the deployed struct.
const PredictDataFieldBcs = bcs.struct('Field<DataKey,PredictData>', {
	id: bcs.Address,
	name: bcs.bool(), // DataKey's hidden dummy_field
	value: PredictData,
});

/** One open position — the coordinates redeem/claim/hasPosition take. */
export interface OpenPosition {
	marketId: string;
	orderId: bigint;
}

/** Resolved-once ids for an owner's position store (cache these). */
export interface PositionsHandle {
	accountUid: string;
	/** Null until the account's Predict data exists (first trade/builder-code). */
	positionsTableId: string | null;
	/** Open-position count at resolution time (from the Table's size). */
	positionCount: bigint;
}

async function contentOf(client: ClientWithCoreApi, objectId: string): Promise<Uint8Array | null> {
	try {
		const { object } = await client.core.getObject({ objectId, include: { content: true } });
		return object.content ?? null;
	} catch (e) {
		// Only a genuinely absent object means "no positions" (never-onboarded
		// owner, or no Predict data yet). Anything else — transport failures,
		// rate limits — must surface, not silently read as an empty portfolio.
		if (/not.?found|does not exist|deleted|NOT_FOUND/i.test(String(e))) return null;
		throw e;
	}
}

/**
 * Resolve the immutable id chain for an owner's positions: wrapper → account
 * UID → PredictData → positions Table. Returns null when the owner has never
 * created a Predict account.
 */
export async function resolvePositionsTable(
	client: ClientWithCoreApi,
	config: GeneratedConfig,
	owner: string,
): Promise<PositionsHandle | null> {
	const wrapperContent = await contentOf(client, deriveAccountWrapperIdFrom(config, owner));
	if (!wrapperContent) return null;
	const accountUid = normalizeSuiAddress(AccountWrapper.parse(wrapperContent).account.account_id);

	// The PredictData field id is derivable — no listing needed for this hop.
	const dataFieldId = deriveDynamicFieldID(
		accountUid,
		`${config.accountPackageId}::account::DataKey<${config.predictPackageId}::predict_account::PredictApp>`,
		new Uint8Array([0]), // DataKey's hidden dummy_field: bool = false
	);
	const fieldContent = await contentOf(client, dataFieldId);
	if (!fieldContent) return { accountUid, positionsTableId: null, positionCount: 0n };

	const data = PredictDataFieldBcs.parse(fieldContent).value;
	return {
		accountUid,
		positionsTableId: normalizeSuiAddress(data.positions.id),
		positionCount: data.positions.size,
	};
}

/**
 * List open positions from a resolved positions Table: one call per page,
 * keys parsed from the dynamic-field NAMES (no per-entry fetches).
 */
export async function positionsFromTable(
	client: ClientWithCoreApi,
	positionsTableId: string,
	opts: { limit?: number; maxPages?: number } = {},
): Promise<OpenPosition[]> {
	const limit = opts.limit ?? 1000;
	const maxPages = opts.maxPages ?? 10;
	const out: OpenPosition[] = [];
	let cursor: string | undefined = undefined;
	for (let page = 0; page < maxPages; page++) {
		const res = await client.core.listDynamicFields({
			parentId: positionsTableId,
			limit,
			cursor,
		});
		for (const entry of res.dynamicFields) {
			const key = PositionKey.parse(entry.name.bcs);
			out.push({
				marketId: normalizeSuiAddress(key.expiry_market_id),
				orderId: key.order_id,
			});
		}
		if (!res.hasNextPage || !res.cursor) return out;
		cursor = res.cursor;
	}
	throw new Error(
		`positions listing exceeded ${maxPages} pages (${out.length} so far) — raise maxPages`,
	);
}

/** Convenience: resolve + list in one call (uncached; the facade caches). */
export async function positions(
	client: ClientWithCoreApi,
	config: GeneratedConfig,
	owner: string,
	opts: { limit?: number; maxPages?: number } = {},
): Promise<OpenPosition[]> {
	const handle = await resolvePositionsTable(client, config, owner);
	if (!handle?.positionsTableId) return [];
	return positionsFromTable(client, handle.positionsTableId, opts);
}
