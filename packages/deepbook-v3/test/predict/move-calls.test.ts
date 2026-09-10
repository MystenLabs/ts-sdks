// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { readdirSync } from 'node:fs';
import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiObjectId } from '@mysten/sui/utils';
import { expect, test } from 'vitest';
import { accountMoveCalls, accountRegistryMoveCalls } from '../../src/account.js';
import * as predictExports from '../../src/predict/index.js';
import {
	PredictClient,
	TESTNET_CONFIG as cfg,
	generateAuth,
	plpMoveCalls,
	toGeneratedConfig,
} from '../../src/predict/index.js';

const OWNER = '0x' + 'ab'.repeat(32);
const COIN = '0x' + 'cd'.repeat(32);
const config = toGeneratedConfig(cfg);

// tx builders never touch the client — these tests only inspect the emitted PTB.
const pc = new PredictClient({ network: 'testnet', client: {} as never });

const b64 = (v: bigint) => Buffer.from(bcs.u64().serialize(v).toBytes()).toString('base64');

function moveCalls(tx: Transaction) {
	return tx.getData().commands.flatMap((c) => ('MoveCall' in c && c.MoveCall ? [c.MoveCall] : []));
}

function inputOf(tx: Transaction, arg: unknown) {
	const a = arg as { $kind: string; Input?: number };
	return a.$kind === 'Input' && a.Input !== undefined ? tx.getData().inputs[a.Input] : undefined;
}

function objectIdOf(tx: Transaction, arg: unknown): string | undefined {
	const input = inputOf(tx, arg);
	if (input && 'UnresolvedObject' in input && input.UnresolvedObject) {
		return input.UnresolvedObject.objectId;
	}
	return undefined;
}

// The motivating case: create an account, fund it, queue a PLP supply and share the wrapper in ONE
// PTB, using nothing but the published `/account` and `/predict` exports.
test('a PLP supply composes with account creation in one PTB from public exports', () => {
	const tx = new Transaction();
	const wrapper = tx.add(accountRegistryMoveCalls._new({ config }));
	tx.add(
		accountMoveCalls.depositFunds({
			config,
			arguments: { wrapper, auth: tx.add(generateAuth(cfg)), coin: tx.object(COIN) },
			typeArguments: [cfg.quoteCoinType],
		}),
	);
	tx.add(
		plpMoveCalls.requestSupply({
			config,
			arguments: {
				wrapper,
				auth: tx.add(generateAuth(cfg)),
				amount: 15_000_000n,
				minPlpOut: 14_850_000n,
			},
		}),
	);
	tx.add(accountMoveCalls.share({ config, arguments: { self: wrapper } }));

	const calls = moveCalls(tx);
	expect(calls.map((c) => `${c.module}::${c.function}`)).toEqual([
		'account_registry::new',
		'account::generate_auth',
		'account::deposit_funds',
		'account::generate_auth',
		'plp::request_supply',
		'account::share',
	]);

	const supply = calls[4];
	expect(normalizeSuiObjectId(supply.package)).toBe(normalizeSuiObjectId(cfg.packages.predict));
	// The shared objects come from `config`, not from the caller.
	expect(objectIdOf(tx, supply.arguments[0])).toBe(normalizeSuiObjectId(cfg.objects.poolVault));
	expect(objectIdOf(tx, supply.arguments[3])).toBe(
		normalizeSuiObjectId(cfg.objects.protocolConfig),
	);
	// The wrapper is the fresh handle from `account_registry::new`, used by value before `share`.
	expect(supply.arguments[1]).toEqual({ $kind: 'Result', Result: 0 });
	expect(inputOf(tx, supply.arguments[4])?.Pure?.bytes).toBe(b64(15_000_000n));
	expect(inputOf(tx, supply.arguments[5])?.Pure?.bytes).toBe(b64(14_850_000n));
});

// The exported thunk is the same binding the facade drives: composed by hand it emits exactly the
// PTB `tx.supplyPlp` does.
test('plpMoveCalls.requestSupply builds the same PTB as the facade supplyPlp', () => {
	const facade = pc.tx.supplyPlp(OWNER, 15, { minPlpOut: 14_850_000n });

	const composed = new Transaction();
	composed.add(
		plpMoveCalls.requestSupply({
			config,
			arguments: {
				wrapper: pc.wrapperIdFor(OWNER),
				auth: composed.add(generateAuth(cfg)),
				amount: 15_000_000n,
				minPlpOut: 14_850_000n,
			},
		}),
	);

	expect(composed.getData()).toEqual(facade.getData());
});

// Every generated Predict module with a callable function or an event layout is exported in full,
// read from the generated directory itself — a module a future codegen run adds fails here until it
// is put on the surface.
test('every generated Predict module with a function or event layout is exported', async () => {
	const exported = new Set(
		Object.values(predictExports).flatMap((ns) =>
			ns && typeof ns === 'object' ? Object.values(ns) : [],
		),
	);
	const files = readdirSync(new URL('../../src/contracts/deepbook_predict/', import.meta.url));
	const missing: string[] = [];
	for (const file of files.filter((f) => f.endsWith('.ts'))) {
		const members = Object.values(await import(`../../src/contracts/deepbook_predict/${file}`));
		const surfaced = file.endsWith('_events.ts') || members.some((m) => typeof m === 'function');
		if (surfaced && !members.every((m) => exported.has(m))) missing.push(file);
	}

	expect(missing).toEqual([]);
});
