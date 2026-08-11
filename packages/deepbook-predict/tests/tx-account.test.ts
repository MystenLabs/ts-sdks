import { Transaction } from '@mysten/sui/transactions';
import { expect, test } from 'vitest';
import { toGeneratedConfig } from '../src/config/generated.js';
import { TESTNET_CONFIG as cfg } from '../src/config/index.js';
import { createAccount } from '../src/tx/account.js';
import { deriveAccountWrapperId } from '../src/tx/common.js';

function targets(tx: Transaction): string[] {
	return tx
		.getData()
		.commands.flatMap((c) =>
			'MoveCall' in c && c.MoveCall
				? [`${c.MoveCall.package}::${c.MoveCall.module}::${c.MoveCall.function}`]
				: [],
		);
}

test('createAccount = registry.new → share', () => {
	const tx = new Transaction();
	tx.add(createAccount(toGeneratedConfig(cfg)));
	expect(targets(tx)).toEqual([
		`${cfg.packages.account}::account_registry::new`,
		`${cfg.packages.account}::account::share`,
	]);
});

test('wrapper id derivation is deterministic', () => {
	const a = deriveAccountWrapperId(cfg, '0x' + 'ab'.repeat(32));
	expect(a).toMatch(/^0x[0-9a-f]{64}$/);
	expect(deriveAccountWrapperId(cfg, '0x' + 'ab'.repeat(32))).toBe(a);
});
