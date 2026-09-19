// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import { TESTNET_ACCOUNT, TESTNET_PREDICT, TESTNET_SESSIONS } from '../../src/deployments/index.js';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function generate(overrides: { chain?: string; original?: string; plp?: string } = {}) {
	const dir = mkdtempSync(join(tmpdir(), 'sdk-deployment-'));
	dirs.push(dir);
	mkdirSync(join(dir, 'src/deployments'), { recursive: true });
	const cfg = TESTNET_PREDICT;
	const manifest = {
		schemaVersion: 8,
		deployment: 'fixture-testnet',
		network: 'testnet',
		chainId: '4c78adac',
		sourceCommit: 'a'.repeat(40),
		packages: {
			...cfg.packages,
			predict: cfg.packages.predictV1,
			sessions: TESTNET_SESSIONS.sessionsPackageIdV1,
			deepbookCoreAccount: TESTNET_SESSIONS.deepbookCoreAccountPackageId,
		},
		objects: {
			...cfg.objects,
			accountRegistry: TESTNET_ACCOUNT.accountRegistry,
			sessionsConfig: TESTNET_SESSIONS.sessionsConfig,
			deepbookRegistry: TESTNET_SESSIONS.deepbookRegistry,
		},
		coinTypes: {
			...cfg.coinTypes,
			usdc: cfg.quoteCoinType,
			plp: overrides.plp ?? cfg.coinTypes.plp,
		},
		underlyings: cfg.underlyings,
		initialConfiguration: { units: cfg.units },
	};
	writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
	for (const [name, latest, original] of [
		['predict', cfg.packages.predict, overrides.original ?? cfg.packages.predictV1],
		['sessions', TESTNET_SESSIONS.sessionsPackageId, TESTNET_SESSIONS.sessionsPackageIdV1],
	]) {
		const pkg = join(dir, 'packages', name);
		mkdirSync(pkg, { recursive: true });
		writeFileSync(
			join(pkg, 'Published.toml'),
			`[published.testnet]\nchain-id = "${overrides.chain ?? '4c78adac'}"\npublished-at = "${latest}"\noriginal-id = "${original}"\n`,
		);
	}
	const result = spawnSync(
		process.execPath,
		[
			'--import',
			import.meta.resolve('tsx'),
			fileURLToPath(new URL('../../scripts/sync-deployment.ts', import.meta.url)),
			'--manifest',
			join(dir, 'manifest.json'),
			'--published-root',
			dir,
		],
		{ cwd: dir, encoding: 'utf8' },
	);
	return { result, output: () => readFileSync(join(dir, 'src/deployments/testnet.ts'), 'utf8') };
}

test('regeneration takes call targets from Published.toml and retains original type IDs', () => {
	const { result, output } = generate();
	expect(result.status, result.stderr).toBe(0);
	const source = output();
	expect(source).toContain(`predict: "${TESTNET_PREDICT.packages.predict}"`);
	expect(source).toContain(`predictV1: "${TESTNET_PREDICT.packages.predictV1}"`);
	expect(source).toContain(`sessionsPackageId: "${TESTNET_SESSIONS.sessionsPackageId}"`);
	expect(source).toContain(`sessionsPackageIdV1: "${TESTNET_SESSIONS.sessionsPackageIdV1}"`);
	expect(source).toContain(TESTNET_PREDICT.coinTypes.plp);
});

test.each([
	[{ chain: 'wrongchain' }, /chain-id does not match/],
	[{ original: '0x' + 'ab'.repeat(32) }, /does not belong/],
	[{ plp: `${TESTNET_PREDICT.packages.predict}::plp::PLP` }, /must use the original/],
] as const)('rejects mismatched publication metadata: %j', (overrides, error) => {
	const { result } = generate(overrides);
	expect(result.status).not.toBe(0);
	expect(result.stderr).toMatch(error);
});
