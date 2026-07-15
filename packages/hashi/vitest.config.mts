// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// vitest/vite doesn't forward `.env` into `process.env` for Node-style
// reads — it only populates `import.meta.env`, filtered to VITE_* keys by
// default. Integration tests use `process.env.HASHI_E2E_SUI_PRIVATE_KEY`,
// so parse `.env` here and inject missing keys via `test.env`. Shell and
// CI-provided env vars (e.g. GitHub Actions secrets) take precedence over
// the local `.env`, which is treated as a fallback for local dev only.
function loadDotEnv(path: string): Record<string, string> {
	const env: Record<string, string> = {};
	let raw: string;
	try {
		raw = readFileSync(path, 'utf8');
	} catch {
		return env;
	}
	for (const line of raw.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		if (key in process.env) continue;
		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		env[key] = value;
	}
	return env;
}

const integrationEnv = loadDotEnv('.env');

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: 'unit',
					include: ['test/unit/**/*.test.ts'],
				},
			},
			{
				test: {
					name: 'integration',
					include: ['test/integration/**/*.test.ts'],
					testTimeout: 30_000,
					env: integrationEnv,
					// Run integration test files one at a time. Even with
					// per-test fresh-signer isolation, the localnet
					// committee processes deposits with limited concurrency
					// — two parallel `client.hashi.deposit()` calls had one
					// settle and the other stall indefinitely (validators
					// detected the request but never advanced past
					// detection; see PR #11 CI run). Sequential execution
					// sidesteps the validator-side race; cost is small
					// (4 files, most fast) and reliability dominates.
					fileParallelism: false,
				},
			},
		],
	},
});
