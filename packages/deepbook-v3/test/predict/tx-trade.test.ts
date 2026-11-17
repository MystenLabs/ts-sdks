// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiObjectId } from '@mysten/sui/utils';
import { expect, test } from 'vitest';
import { toGeneratedConfig } from '../../src/predict/config/generated.js';
import { TESTNET_CONFIG as cfg } from '../../src/predict/config/index.js';
import { redeemSettled } from '../../src/predict/tx/trade.js';

// Account calls target the latest account package (a PTB can't call one older than Predict links);
// event and struct types keep the original `cfg.packages.account`.
const ACCOUNT_CALLS = cfg.packages.accountLatest ?? cfg.packages.account;

const config = toGeneratedConfig(cfg);

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

// Resolve the base64 pure bytes an argument points at, or undefined if the
// argument is not a pure input (e.g. it's an object or a command result).
function argPureBytes(tx: Transaction, cmdIdx: number, argIdx: number): string | undefined {
	const arg = call(tx, cmdIdx).arguments[argIdx] as { $kind: string; Input?: number };
	if (arg.$kind !== 'Input' || arg.Input === undefined) return undefined;
	const input = tx.getData().inputs[arg.Input];
	return 'Pure' in input && input.Pure ? input.Pure.bytes : undefined;
}

// Resolve the object id an argument points at, or undefined if it is not an
// object input (e.g. it's a pure value or a command result).
function argObjectId(tx: Transaction, cmdIdx: number, argIdx: number): string | undefined {
	const arg = call(tx, cmdIdx).arguments[argIdx] as { $kind: string; Input?: number };
	if (arg.$kind !== 'Input' || arg.Input === undefined) return undefined;
	const input = tx.getData().inputs[arg.Input];
	if ('Object' in input && input.Object) {
		const o = input.Object;
		if ('ImmOrOwnedObject' in o && o.ImmOrOwnedObject) return o.ImmOrOwnedObject.objectId;
		if ('SharedObject' in o && o.SharedObject) return o.SharedObject.objectId;
	}
	if ('UnresolvedObject' in input && input.UnresolvedObject) return input.UnresolvedObject.objectId;
	return undefined;
}

// True when the argument at (cmdIdx, argIdx) is an object input pointing at `expected`,
// comparing in normalized 32-byte form (moveCall pads short ids like "0xabc").
function expectObject(tx: Transaction, cmdIdx: number, argIdx: number, expected: string) {
	expect(argObjectId(tx, cmdIdx, argIdx)).toBe(normalizeSuiObjectId(expected));
}

const u256B64 = (v: bigint) => Buffer.from(bcs.u256().serialize(v).toBytes()).toString('base64');

test('redeemSettled: auth → redeem_settled, 7 args, owner-auth hot potato', () => {
	const tx = new Transaction();
	tx.add(
		redeemSettled(config, {
			expiryMarketId: '0xabc',
			wrapperId: '0xdef',
			orderId: 42n,
		}),
	);
	// owner-auth form now mints an Auth hot potato first (no accountRegistry/oracle/pyth)
	expect(targets(tx)).toEqual([
		`${ACCOUNT_CALLS}::account::generate_auth`,
		`${cfg.packages.predict}::expiry_market::redeem_settled`,
	]);
	const redeem = call(tx, 1);
	// deployed: market, wrapper, auth, config, order_id u256, root, clock
	// → 7 moveCall args (no live pricer: settlement price is fixed; a settled claim
	// closes the order in full, so the entrypoint takes no quantity)
	expect(redeem.arguments).toHaveLength(7);
	expectObject(tx, 1, 0, '0xabc'); // market
	expectObject(tx, 1, 1, '0xdef'); // wrapper
	expect(redeem.arguments[2].$kind).toBe('Result'); // auth (owner-auth hot potato)
	expectObject(tx, 1, 3, cfg.objects.protocolConfig); // config
	expect(argPureBytes(tx, 1, 4)).toBe(u256B64(42n)); // order_id (u256)
	expectObject(tx, 1, 5, '0xacc'); // root
	expectObject(tx, 1, 6, '0x6'); // clock
});
