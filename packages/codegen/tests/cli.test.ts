// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI = join(__dirname, '..', 'dist', 'bin', 'cli.mjs');
const FIXTURE = join(__dirname, 'move', 'testpkg');

function run(args: string[], cwd: string) {
	const res = spawnSync('node', [CLI, ...args], { cwd, encoding: 'utf-8' });
	return { code: res.status ?? -1, stdout: res.stdout, stderr: res.stderr };
}

describe('CLI', () => {
	if (!existsSync(CLI)) {
		it.skip('build dist/bin/cli.mjs first (run `pnpm --filter @mysten/codegen build`)', () => {});
		return;
	}

	describe('exit codes', () => {
		it('exits non-zero when generate fails', { timeout: 30_000 }, async () => {
			const dir = await mkdtemp(join(tmpdir(), 'codegen-cli-fail-'));
			try {
				await writeFile(
					join(dir, 'Move.toml'),
					'[package]\nname = "different_name"\nedition = "2024"\n',
				);
				await mkdir(join(dir, 'package_summaries', 'mismatched_label'), { recursive: true });
				await writeFile(
					join(dir, 'package_summaries', 'address_mapping.json'),
					JSON.stringify({ mismatched_label: '0x0' }),
				);

				const { code, stderr } = run(['generate', '--noSummaries', 'true', '.'], dir);
				expect(code, `stderr: ${stderr}`).not.toBe(0);
				expect(stderr).toContain('Could not identify main package directory');
				expect(stderr).toContain('mismatched_label');
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		});

		it('exits non-zero on bad CLI flag', async () => {
			const dir = await mkdtemp(join(tmpdir(), 'codegen-cli-fail-'));
			try {
				const { code, stderr } = run(['generate', '--no-such-flag'], dir);
				expect(code, `stderr: ${stderr}`).not.toBe(0);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		});
	});

	describe('path-arg invocation', () => {
		it('works against a Move.toml with no [addresses] block', { timeout: 30_000 }, async () => {
			const dir = await mkdtemp(join(tmpdir(), 'codegen-cli-fresh-'));
			try {
				await mkdir(join(dir, 'testpkg'), { recursive: true });
				await writeFile(
					join(dir, 'testpkg', 'Move.toml'),
					'[package]\nname = "testpkg"\nedition = "2024"\n',
				);
				await cp(join(FIXTURE, 'package_summaries'), join(dir, 'testpkg', 'package_summaries'), {
					recursive: true,
				});

				const { code, stderr } = run(
					['generate', '--noSummaries', 'true', '--outputDir', './out', './testpkg'],
					dir,
				);
				expect(code, `stderr: ${stderr}`).toBe(0);
				expect(existsSync(join(dir, 'out', 'testpkg', 'counter.ts'))).toBe(true);
				expect(existsSync(join(dir, 'out', 'utils', 'index.ts'))).toBe(true);

				const counter = await readFile(join(dir, 'out', 'testpkg', 'counter.ts'), 'utf-8');
				expect(counter).toContain("'@local-pkg/testpkg'");
				expect(counter).not.toContain("'@local-pkg/./testpkg'");
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		});
	});
});
