// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from '@mysten/sui/transactions';
import { expect, test } from 'vitest';
import { TESTNET_CONFIG as cfg } from '../../src/predict/config/index.js';
import {
	accountContract,
	deriveAccountWrapperId,
	generateAuth,
} from '../../src/predict/tx/common.js';

// Account calls target the latest account package (a PTB can't call one older than Predict links);
// event and struct types keep the original `cfg.packages.account`.
const ACCOUNT_CALLS = cfg.packages.accountLatest ?? cfg.packages.account;

// The shared account primitive itself is tested in `@mysten/deepbook-v3/account`; what
// Predict owns is the adapter — that its config's ids are the ones driving those builders.
function targets(tx: Transaction): string[] {
	return tx
		.getData()
		.commands.flatMap((c) =>
			'MoveCall' in c && c.MoveCall
				? [`${c.MoveCall.package}::${c.MoveCall.module}::${c.MoveCall.function}`]
				: [],
		);
}

test('adapter binds Predict config ids: generate_auth targets the account package', () => {
	const tx = new Transaction();
	tx.add(generateAuth(cfg));
	expect(targets(tx)).toEqual([`${ACCOUNT_CALLS}::account::generate_auth`]);
});

test('adapter binds the account registry: createAccount uses it as the `new` argument', () => {
	const tx = new Transaction();
	tx.add(accountContract(cfg).createAccount());
	expect(targets(tx)).toEqual([
		`${ACCOUNT_CALLS}::account_registry::new`,
		`${ACCOUNT_CALLS}::account::share`,
	]);
	const input = tx.getData().inputs[0];
	const id = 'UnresolvedObject' in input ? input.UnresolvedObject?.objectId : undefined;
	expect(id).toBe(cfg.objects.accountRegistry);
});

test('wrapper id derivation is deterministic', () => {
	const a = deriveAccountWrapperId(cfg, '0x' + 'ab'.repeat(32));
	expect(a).toMatch(/^0x[0-9a-f]{64}$/);
	expect(deriveAccountWrapperId(cfg, '0x' + 'ab'.repeat(32))).toBe(a);
});
