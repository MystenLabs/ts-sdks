// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { deriveDynamicFieldID, deriveObjectID, normalizeSuiAddress } from '@mysten/sui/utils';
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

describe('id derivation pinned to observed testnet state', () => {
	// These vectors were read off testnet, not computed by this SDK. The account and its
	// `DataKey<App>` field below were observed on the `predict-testnet-8-21` deployment:
	// the registry lists the account as a claimed derived object, and the account carries
	// exactly one dynamic field whose id is DATA_FIELD_ID.
	//
	// They pin the rule that got this wrong once: the account and wrapper ids are
	// `derived_object::claim`ed, but the app-data slot is a PLAIN dynamic field written by
	// `account::attach` via `df::add`. The two derivations produce different ids, and only
	// the plain-dynamic-field one exists on chain.
	const ACCOUNT_PKG_T = '0xa94ec89b6cbb3e2609c7ca65bd77885b7513f852922ebdf8e766851fb6f85259';
	const PREDICT_PKG_T = '0x421041754244cf0e985fb9c9f5e1f49428caf3df4cde3a7b266d8e18ea63597b';
	const REGISTRY_T = '0x5682c73d657de1546374e632369a25c82744c8a20e9b4f47e6558e3d4bde88d3';
	const OWNER_T = '0xb3d277c50f7b846a5f609a8d13428ae482b5826bb98437997373f3a0d60d280e';
	const ACCOUNT_ID_T = '0x9c13309443ddccd2d59b59e6d470109c016ae6e6e9b83fbd93d930cbba742d5b';
	const DATA_FIELD_ID_T = '0x707114dcc1ca48b47771e4ea4e6bc696c9e0fbb25c8df520068860a64cd99d8e';

	const AccountKeyBcs = bcs.struct('AccountKey', { pos0: bcs.Address });

	test('deriveAccountId reproduces an account claimed on testnet', () => {
		const contract = new SessionsContract({
			sessionsPackageId: SESSIONS_PKG,
			sessionsConfig: SESSIONS_CONFIG,
			accountPackageId: ACCOUNT_PKG_T,
			accountRegistry: REGISTRY_T,
		});
		expect(contract.deriveAccountId(OWNER_T)).toBe(ACCOUNT_ID_T);
	});

	test('the app-data slot uses plain dynamic-field derivation, not derived-object', () => {
		const tag = `${ACCOUNT_PKG_T}::account::DataKey<${PREDICT_PKG_T}::predict_account::PredictApp>`;
		const key = new Uint8Array([0]);
		// The id that actually exists on chain.
		expect(deriveDynamicFieldID(ACCOUNT_ID_T, tag, key)).toBe(DATA_FIELD_ID_T);
		// The id `deriveObjectID` would produce — points at nothing.
		expect(deriveObjectID(ACCOUNT_ID_T, tag, key)).not.toBe(DATA_FIELD_ID_T);
	});

	test('deriveSessionsFieldId follows the plain dynamic-field rule', () => {
		const contract = new SessionsContract({
			sessionsPackageId: SESSIONS_PKG,
			sessionsConfig: SESSIONS_CONFIG,
			accountPackageId: ACCOUNT_PKG_T,
			accountRegistry: REGISTRY_T,
		});
		const expected = deriveDynamicFieldID(
			contract.deriveAccountId(OWNER_T),
			`${ACCOUNT_PKG_T}::account::DataKey<${SESSIONS_PKG}::sessions::SessionsApp>`,
			new Uint8Array([0]),
		);
		expect(contract.deriveSessionsFieldId(OWNER_T)).toBe(expected);
		// Guard the exact regression: the derived-object form must not be what we return.
		expect(contract.deriveSessionsFieldId(OWNER_T)).not.toBe(
			deriveObjectID(
				contract.deriveAccountId(OWNER_T),
				`${ACCOUNT_PKG_T}::account::DataKey<${SESSIONS_PKG}::sessions::SessionsApp>`,
				new Uint8Array([0]),
			),
		);
	});

	// AccountKeyBcs documents the key shape the derivation feeds; unused elsewhere.
	test('AccountKey serializes as a bare 32-byte address', () => {
		expect(AccountKeyBcs.serialize({ pos0: OWNER_T }).toBytes()).toHaveLength(32);
	});
});

describe('same-typed argument slots are pinned, not merely counted', () => {
	// Every numeric parameter gets a DISTINCT sentinel, so transposing any two of them —
	// the failure a slot-count or "two zeros are present" assertion cannot see — breaks a
	// specific expectation. Slot indices come from the deployed signature: five `u64`s at
	// 6..10 on both mints, and `u256` + three `u64`s at 6..9 on redeemLive.
	const pricerArg = { $kind: 'Result', Result: 0 } as never;

	/** Decode the pure input a given argument slot points at. */
	function pureAt(tx: Transaction, argIdx: number, type: 'u64' | 'u256'): bigint {
		const arg = call(tx, 0).arguments[argIdx] as { $kind: string; Input?: number };
		expect(arg.$kind).toBe('Input');
		const input = tx.getData().inputs[arg.Input!];
		const bytes = ('Pure' in input && input.Pure ? input.Pure.bytes : undefined)!;
		const raw = Uint8Array.from(Buffer.from(bytes, 'base64'));
		// `@mysten/sui/bcs` yields decimal strings here — the bigint overrides apply only to
		// the generated bindings, not to this raw schema.
		return BigInt(type === 'u64' ? bcs.u64().parse(raw) : bcs.u256().parse(raw));
	}

	test('mintExactQuantity: lowerTick, higherTick, quantity, maxCost, maxProbability in order', () => {
		const tx = new Transaction();
		tx.add(
			contract.mintExactQuantity({
				expiryMarketId: MARKET,
				wrapperId: WRAPPER,
				protocolConfig: PROTOCOL_CONFIG,
				pricer: pricerArg,
				lowerTick: 1001n,
				higherTick: 1002n,
				quantity: 1003n,
				maxCost: 1004n,
				maxProbability: 1005n,
			}),
		);
		expect([6, 7, 8, 9, 10].map((i) => pureAt(tx, i, 'u64'))).toEqual([
			1001n,
			1002n,
			1003n,
			1004n,
			1005n,
		]);
	});

	test('mintExactAmount: lowerTick, higherTick, maxPremium, minQuantity, maxCost in order', () => {
		const tx = new Transaction();
		tx.add(
			contract.mintExactAmount({
				expiryMarketId: MARKET,
				wrapperId: WRAPPER,
				protocolConfig: PROTOCOL_CONFIG,
				pricer: pricerArg,
				lowerTick: 2001n,
				higherTick: 2002n,
				maxPremium: 2003n,
				minQuantity: 2004n,
				maxCost: 2005n,
			}),
		);
		expect([6, 7, 8, 9, 10].map((i) => pureAt(tx, i, 'u64'))).toEqual([
			2001n,
			2002n,
			2003n,
			2004n,
			2005n,
		]);
	});

	test('redeemLive: orderId is u256, then closeQuantity, minProbability, minProceeds', () => {
		const tx = new Transaction();
		tx.add(
			contract.redeemLive({
				expiryMarketId: MARKET,
				wrapperId: WRAPPER,
				protocolConfig: PROTOCOL_CONFIG,
				pricer: pricerArg,
				orderId: 3001n,
				closeQuantity: 3002n,
				minProbability: 3003n,
				minProceeds: 3004n,
			}),
		);
		expect(pureAt(tx, 6, 'u256')).toBe(3001n);
		expect([7, 8, 9].map((i) => pureAt(tx, i, 'u64'))).toEqual([3002n, 3003n, 3004n]);
	});

	test('redeemLive: an order id above 2**53 survives the builder exactly', () => {
		// u256 order ids are full-width; a `number` hop here would round.
		const big = 2n ** 200n + 12345n;
		const tx = new Transaction();
		tx.add(
			contract.redeemLive({
				expiryMarketId: MARKET,
				wrapperId: WRAPPER,
				protocolConfig: PROTOCOL_CONFIG,
				pricer: pricerArg,
				orderId: big,
				closeQuantity: 1n,
			}),
		);
		expect(pureAt(tx, 6, 'u256')).toBe(big);
	});

	test('redeemSettled: orderId is the only pure argument', () => {
		const tx = new Transaction();
		tx.add(
			contract.redeemSettled({
				expiryMarketId: MARKET,
				wrapperId: WRAPPER,
				protocolConfig: PROTOCOL_CONFIG,
				orderId: 4001n,
			}),
		);
		expect(pureAt(tx, 5, 'u256')).toBe(4001n);
	});
});

describe('expiredSessions is the exact complement of activeSessions', () => {
	const grants = [
		{ session: normalizeSuiAddress('0x' + 'a1'.repeat(32)), expiresAtMs: 1_000n },
		{ session: normalizeSuiAddress('0x' + 'b2'.repeat(32)), expiresAtMs: 5_000n },
	];

	test('a grant AT its expiry counts as expired, not active', () => {
		expect(SessionsContract.activeSessions(grants, 1_000).map((g) => g.expiresAtMs)).toEqual([
			5_000n,
		]);
		expect(SessionsContract.expiredSessions(grants, 1_000).map((g) => g.expiresAtMs)).toEqual([
			1_000n,
		]);
	});

	test('the two partitions are disjoint and cover everything at any instant', () => {
		for (const now of [0, 999, 1_000, 1_001, 5_000, 9_999]) {
			const active = SessionsContract.activeSessions(grants, now);
			const expired = SessionsContract.expiredSessions(grants, now);
			expect(active.length + expired.length).toBe(grants.length);
			expect(active.filter((a) => expired.includes(a))).toEqual([]);
		}
	});
});
