import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiObjectId } from '@mysten/sui/utils';
import { expect, test } from 'vitest';
import { PredictClient } from '../src/client.js';
import { TESTNET_CONFIG as cfg } from '../src/config/index.js';

const OWNER = '0x' + 'ab'.repeat(32);

// tx builders never touch the client — these tests only inspect the emitted PTB.
const pc = new PredictClient({ network: 'testnet', client: {} as never });
const WRAPPER = pc.wrapperIdFor(OWNER);

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
// comparing in normalized 32-byte form (moveCall pads short ids like "0xdef").
function expectObject(tx: Transaction, cmdIdx: number, argIdx: number, expected: string) {
	expect(argObjectId(tx, cmdIdx, argIdx)).toBe(normalizeSuiObjectId(expected));
}

// Resolve the base64 pure bytes an argument points at, or undefined if the
// argument is not a pure input.
function argPureBytes(tx: Transaction, cmdIdx: number, argIdx: number): string | undefined {
	const arg = call(tx, cmdIdx).arguments[argIdx] as { $kind: string; Input?: number };
	if (arg.$kind !== 'Input' || arg.Input === undefined) return undefined;
	const input = tx.getData().inputs[arg.Input];
	return 'Pure' in input && input.Pure ? input.Pure.bytes : undefined;
}

const b64 = (v: bigint) => Buffer.from(bcs.u64().serialize(v).toBytes()).toString('base64');

const AUTH = `${cfg.packages.account}::account::generate_auth`;

test('supplyPlp: auth → request_supply, 8 args, min-plp-out floor slot', () => {
	const tx = pc.tx.supplyPlp(OWNER, 5);
	expect(targets(tx)).toEqual([AUTH, `${cfg.packages.predict}::plp::request_supply`]);
	const c = call(tx, 1);
	// deployed sig: (vault, wrapper, auth, config, amount u64, min_plp_out u64, root, clock, ctx)
	// → 8 moveCall args (ctx is implicit, clock auto-injected)
	expect(c.arguments).toHaveLength(8);
	// slot 0: vault = cfg.objects.poolVault
	expectObject(tx, 1, 0, cfg.objects.poolVault);
	// slot 1: wrapper
	expectObject(tx, 1, 1, WRAPPER);
	// slot 2: auth (Result from generate_auth immediately before this call)
	expect(c.arguments[2].$kind).toBe('Result');
	// slot 3: config = cfg.objects.protocolConfig
	expectObject(tx, 1, 3, cfg.objects.protocolConfig);
	// slot 4: pure u64 amount — 5 USDC → 5_000_000 raw
	expect(argPureBytes(tx, 1, 4)).toBe(b64(5_000_000n));
	// slot 5: pure u64 min_plp_out slippage floor, pinned to 0 (no floor)
	expect(argPureBytes(tx, 1, 5)).toBe(b64(0n));
	// slot 6: root = 0xacc, slot 7: clock = 0x6
	expectObject(tx, 1, 6, '0xacc');
	expectObject(tx, 1, 7, '0x6');
});

test('withdrawPlp: auth → request_withdraw, 8 args, shares + min-dusdc-out floor', () => {
	const tx = pc.tx.withdrawPlp(OWNER, 1_234n);
	expect(targets(tx)).toEqual([AUTH, `${cfg.packages.predict}::plp::request_withdraw`]);
	const c = call(tx, 1);
	// deployed sig: (vault, wrapper, auth, config, amount u64, min_dusdc_out u64, root, clock, ctx)
	// → 8 moveCall args
	expect(c.arguments).toHaveLength(8);
	expectObject(tx, 1, 0, cfg.objects.poolVault);
	expectObject(tx, 1, 1, WRAPPER);
	expect(c.arguments[2].$kind).toBe('Result');
	expectObject(tx, 1, 3, cfg.objects.protocolConfig);
	// slot 4: pure u64 — the Move param is `amount` but it counts PLP SHARES, passed raw
	expect(argPureBytes(tx, 1, 4)).toBe(b64(1_234n));
	// slot 5: pure u64 min_dusdc_out slippage floor, pinned to 0 (no floor)
	expect(argPureBytes(tx, 1, 5)).toBe(b64(0n));
	expectObject(tx, 1, 6, '0xacc');
	expectObject(tx, 1, 7, '0x6');
});

test('cancelSupplyPlp: auth → cancel_supply_request, 7 args, index in u64 slot', () => {
	const tx = pc.tx.cancelSupplyPlp(OWNER, 3n);
	expect(targets(tx)).toEqual([AUTH, `${cfg.packages.predict}::plp::cancel_supply_request`]);
	const c = call(tx, 1);
	expect(c.arguments).toHaveLength(7);
	expectObject(tx, 1, 0, cfg.objects.poolVault);
	expectObject(tx, 1, 1, WRAPPER);
	expect(c.arguments[2].$kind).toBe('Result');
	expectObject(tx, 1, 3, cfg.objects.protocolConfig);
	expect(argPureBytes(tx, 1, 4)).toBe(b64(3n));
	expectObject(tx, 1, 5, '0xacc');
	expectObject(tx, 1, 6, '0x6');
});

test('cancelWithdrawPlp: auth → cancel_withdraw_request, 7 args, index in u64 slot', () => {
	const tx = pc.tx.cancelWithdrawPlp(OWNER, 7n);
	expect(targets(tx)).toEqual([AUTH, `${cfg.packages.predict}::plp::cancel_withdraw_request`]);
	const c = call(tx, 1);
	expect(c.arguments).toHaveLength(7);
	expectObject(tx, 1, 0, cfg.objects.poolVault);
	expectObject(tx, 1, 1, WRAPPER);
	expect(c.arguments[2].$kind).toBe('Result');
	expectObject(tx, 1, 3, cfg.objects.protocolConfig);
	expect(argPureBytes(tx, 1, 4)).toBe(b64(7n));
	expectObject(tx, 1, 5, '0xacc');
	expectObject(tx, 1, 6, '0x6');
});

test('setBuilderCode: auth → set_builder_code (predict pkg), 3 args', () => {
	const tx = pc.tx.setBuilderCode(OWNER, '0xbc0de');
	expect(targets(tx)).toEqual([AUTH, `${cfg.packages.predict}::predict_account::set_builder_code`]);
	const c = call(tx, 1);
	// deployed sig: (wrapper, auth, code: &BuilderCode, ctx) → 3 moveCall args
	expect(c.arguments).toHaveLength(3);
	expectObject(tx, 1, 0, WRAPPER); // wrapper
	expect(c.arguments[1].$kind).toBe('Result'); // auth
	expectObject(tx, 1, 2, '0xbc0de'); // builder code object
});

test('unsetBuilderCode: auth → unset_builder_code (predict pkg), 2 args', () => {
	const tx = pc.tx.unsetBuilderCode(OWNER);
	expect(targets(tx)).toEqual([
		AUTH,
		`${cfg.packages.predict}::predict_account::unset_builder_code`,
	]);
	const c = call(tx, 1);
	// deployed sig: (wrapper, auth, ctx) → 2 moveCall args
	expect(c.arguments).toHaveLength(2);
	expectObject(tx, 1, 0, WRAPPER); // wrapper
	expect(c.arguments[1].$kind).toBe('Result'); // auth
});
