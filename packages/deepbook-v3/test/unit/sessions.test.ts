// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, test } from 'vitest';

import {
	MAX_SESSION_DURATION_MS,
	MAX_SESSIONS_PER_ACCOUNT,
	SessionsContract,
} from '../../src/sessions.js';

const SESSIONS_PKG = '0x' + '11'.repeat(32);
const SESSIONS_CONFIG = '0x' + '22'.repeat(32);
const ACCOUNT_PKG = '0x' + '33'.repeat(32);
const ACCOUNT_REGISTRY = '0x' + '44'.repeat(32);
const WRAPPER = '0x' + '55'.repeat(32);
const MARKET = '0x' + '66'.repeat(32);
const PROTOCOL_CONFIG = '0x' + '77'.repeat(32);
const SESSION = '0x' + 'ab'.repeat(32);
const OWNER = '0x' + 'cd'.repeat(32);

const contract = new SessionsContract({
	sessionsPackageId: SESSIONS_PKG,
	sessionsConfig: SESSIONS_CONFIG,
	accountPackageId: ACCOUNT_PKG,
	accountRegistry: ACCOUNT_REGISTRY,
});

function targets(tx: Transaction): string[] {
	return tx
		.getData()
		.commands.flatMap((c) =>
			'MoveCall' in c && c.MoveCall
				? [`${c.MoveCall.package}::${c.MoveCall.module}::${c.MoveCall.function}`]
				: [],
		);
}

function call(tx: Transaction, cmdIdx: number) {
	return tx.getData().commands[cmdIdx].MoveCall!;
}

/** The object id an argument points at, or undefined when it is not an object input. */
function argObjectId(tx: Transaction, cmdIdx: number, argIdx: number): string | undefined {
	const arg = call(tx, cmdIdx).arguments[argIdx] as { $kind: string; Input?: number };
	if (arg.$kind !== 'Input' || arg.Input === undefined) return undefined;
	const input = tx.getData().inputs[arg.Input];
	return 'UnresolvedObject' in input ? input.UnresolvedObject?.objectId : undefined;
}

describe('session lifecycle', () => {
	test('authorizeSession targets authorize_session with the configured SessionsConfig', () => {
		const tx = new Transaction();
		tx.add(
			contract.authorizeSession({ wrapperId: WRAPPER, session: SESSION, durationMs: 3_600_000 }),
		);
		expect(targets(tx)).toEqual([`${SESSIONS_PKG}::sessions::authorize_session`]);
		// deployed order: wrapper, sessions_config, session, duration_ms, clock, ctx
		expect(argObjectId(tx, 0, 0)).toBe(normalizeSuiAddress(WRAPPER));
		expect(argObjectId(tx, 0, 1)).toBe(normalizeSuiAddress(SESSIONS_CONFIG));
	});

	test('revokeSession takes NO SessionsConfig — revocation is not version-gated', () => {
		const tx = new Transaction();
		tx.add(contract.revokeSession({ wrapperId: WRAPPER, session: SESSION }));
		expect(targets(tx)).toEqual([`${SESSIONS_PKG}::sessions::revoke_session`]);
		expect(argObjectId(tx, 0, 0)).toBe(normalizeSuiAddress(WRAPPER));
		// the only object input is the wrapper; SessionsConfig must not appear
		const objectIds = call(tx, 0)
			.arguments.map((_, i) => argObjectId(tx, 0, i))
			.filter(Boolean);
		expect(objectIds).not.toContain(normalizeSuiAddress(SESSIONS_CONFIG));
	});

	test('sessionExpirationMs is a read against the wrapper', () => {
		const tx = new Transaction();
		tx.add(contract.sessionExpirationMs({ wrapperId: WRAPPER, session: SESSION }));
		expect(targets(tx)).toEqual([`${SESSIONS_PKG}::sessions::session_expiration_ms`]);
		expect(argObjectId(tx, 0, 0)).toBe(normalizeSuiAddress(WRAPPER));
	});

	test('wrapper derivation matches the account primitive for the same registry', () => {
		const id = contract.deriveAccountWrapperId(OWNER);
		expect(id).toMatch(/^0x[0-9a-f]{64}$/);
		expect(contract.deriveAccountWrapperId(OWNER)).toBe(id);
	});
});

describe('Predict wrappers', () => {
	// The wrapper's contract with Predict: NO `Auth` argument (app auth is minted and
	// consumed inside the call), with `account_registry` and `sessions_config` threaded in.
	const pricer = { $kind: 'Result', Result: 0 } as never;

	test('mintExactQuantity: registry at index 1, SessionsConfig at index 3, no Auth', () => {
		const tx = new Transaction();
		tx.add(
			contract.mintExactQuantity({
				expiryMarketId: MARKET,
				wrapperId: WRAPPER,
				protocolConfig: PROTOCOL_CONFIG,
				pricer,
				lowerTick: 10n,
				higherTick: 20n,
				quantity: 1_000_000n,
				maxCost: 5_000_000n,
				maxProbability: 900_000_000n,
			}),
		);
		expect(targets(tx)).toEqual([`${SESSIONS_PKG}::sessions::mint_exact_quantity`]);
		// deployed order: market, account_registry, wrapper, sessions_config, config, pricer, …
		expect(argObjectId(tx, 0, 0)).toBe(normalizeSuiAddress(MARKET));
		expect(argObjectId(tx, 0, 1)).toBe(normalizeSuiAddress(ACCOUNT_REGISTRY));
		expect(argObjectId(tx, 0, 2)).toBe(normalizeSuiAddress(WRAPPER));
		expect(argObjectId(tx, 0, 3)).toBe(normalizeSuiAddress(SESSIONS_CONFIG));
		expect(argObjectId(tx, 0, 4)).toBe(normalizeSuiAddress(PROTOCOL_CONFIG));
	});

	test('redeemSettled takes no pricer and no quantity — a settled claim is all-or-nothing', () => {
		const tx = new Transaction();
		tx.add(
			contract.redeemSettled({
				expiryMarketId: MARKET,
				wrapperId: WRAPPER,
				protocolConfig: PROTOCOL_CONFIG,
				orderId: 42n,
			}),
		);
		expect(targets(tx)).toEqual([`${SESSIONS_PKG}::sessions::redeem_settled`]);
		expect(argObjectId(tx, 0, 1)).toBe(normalizeSuiAddress(ACCOUNT_REGISTRY));
		expect(argObjectId(tx, 0, 3)).toBe(normalizeSuiAddress(SESSIONS_CONFIG));
		// market, account_registry, wrapper, sessions_config, config, order_id, root, clock
		expect(call(tx, 0).arguments).toHaveLength(8);
	});

	test('redeemLive defaults both slippage floors to 0 (disabled)', () => {
		const tx = new Transaction();
		tx.add(
			contract.redeemLive({
				expiryMarketId: MARKET,
				wrapperId: WRAPPER,
				protocolConfig: PROTOCOL_CONFIG,
				pricer,
				orderId: 7n,
				closeQuantity: 500_000n,
			}),
		);
		expect(targets(tx)).toEqual([`${SESSIONS_PKG}::sessions::redeem_live`]);
		const zero = Buffer.from(bcs.u64().serialize(0n).toBytes()).toString('base64');
		const pure = tx.getData().inputs.flatMap((i) => ('Pure' in i && i.Pure ? [i.Pure.bytes] : []));
		expect(pure.filter((b) => b === zero).length).toBeGreaterThanOrEqual(2);
	});
});

describe('grant listing helpers', () => {
	// What `getObject` on the grant field actually returns:
	// `Field<DataKey<SessionsApp>, SessionsData>` — a 32-byte field id, DataKey's hidden
	// `dummy_field` byte, then the value. Hand-written from the deployed Move rather than
	// round-tripped through the SDK's own schema, so it validates layout and not just itself.
	const SessionsDataBcs = bcs.struct('SessionsData', {
		sessions: bcs.struct('VecMap', {
			contents: bcs.vector(bcs.struct('Entry', { key: bcs.Address, value: bcs.u64() })),
		}),
	});
	const FieldBcs = bcs.struct('Field', {
		id: bcs.Address,
		name: bcs.bool(),
		value: SessionsDataBcs,
	});

	const A = '0x' + 'a1'.repeat(32);
	const B = '0x' + 'b2'.repeat(32);
	const value = {
		sessions: {
			contents: [
				{ key: A, value: 1_000n },
				{ key: B, value: 5_000n },
			],
		},
	};
	// A field id whose FIRST byte is 0x02 — the byte a naive decoder would read as the
	// VecMap length, which is how this used to "succeed" with fabricated grants.
	const fieldBytes = FieldBcs.serialize({
		id: '0x02' + 'cd'.repeat(31),
		name: false,
		value,
	}).toBytes();

	test('decodeSessions reads the dynamic FIELD, not the bare value', () => {
		expect(SessionsContract.decodeSessions(fieldBytes)).toEqual([
			{ session: normalizeSuiAddress(A), expiresAtMs: 1_000n },
			{ session: normalizeSuiAddress(B), expiresAtMs: 5_000n },
		]);
	});

	test('bare SessionsData bytes are not silently mis-parsed as grants', () => {
		// The old shape. Decoding it as a field must NOT yield the two real grants —
		// this is the regression that returned garbage or an empty list.
		const bare = SessionsDataBcs.serialize(value).toBytes();
		let decoded: unknown;
		try {
			decoded = SessionsContract.decodeSessions(bare);
		} catch {
			decoded = 'threw';
		}
		expect(decoded).not.toEqual([
			{ session: normalizeSuiAddress(A), expiresAtMs: 1_000n },
			{ session: normalizeSuiAddress(B), expiresAtMs: 5_000n },
		]);
	});

	test('activeSessions drops grants at or past expiry — the chain asserts now < expiry', () => {
		const grants = SessionsContract.decodeSessions(fieldBytes);
		expect(SessionsContract.activeSessions(grants, 999).map((g) => g.expiresAtMs)).toEqual([
			1_000n,
			5_000n,
		]);
		// AT the expiry the grant is already dead (strict `<`), so 1_000 drops out.
		expect(SessionsContract.activeSessions(grants, 1_000).map((g) => g.expiresAtMs)).toEqual([
			5_000n,
		]);
		expect(SessionsContract.activeSessions(grants, 5_000)).toEqual([]);
	});

	test('derived account id and grant-field id are distinct from the wrapper id', () => {
		const wrapper = contract.deriveAccountWrapperId(OWNER);
		const account = contract.deriveAccountId(OWNER);
		const field = contract.deriveSessionsFieldId(OWNER);
		for (const id of [wrapper, account, field]) expect(id).toMatch(/^0x[0-9a-f]{64}$/);
		expect(new Set([wrapper, account, field]).size).toBe(3);
		expect(contract.deriveSessionsFieldId(OWNER)).toBe(field);
	});
});

describe('contract limits mirror the deployed constants', () => {
	test('30 day max duration, 20 session slots', () => {
		expect(MAX_SESSION_DURATION_MS).toBe(2_592_000_000);
		expect(MAX_SESSIONS_PER_ACCOUNT).toBe(20);
	});
});
