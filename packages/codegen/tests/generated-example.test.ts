// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { generateFromPackageSummary } from '../src/index.js';

const FIXTURE_PATH = join(__dirname, 'move/testpkg');
/**
 * A committed example of generated output with `configArguments` enabled, so changes to the
 * generated-code shape show up in review diffs. Update with:
 *
 *   UPDATE_GENERATED_EXAMPLE=1 pnpm vitest run tests/generated-example.test.ts
 */
const EXAMPLE_DIR = join(__dirname, 'generated-example');

async function walk(dir: string, base = dir): Promise<string[]> {
	const files: string[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await walk(path, base)));
		} else {
			files.push(relative(base, path));
		}
	}
	return files.sort();
}

describe('generated example', () => {
	it('committed example output is up to date', async () => {
		const dir = await mkdtemp(join(__dirname, 'generated-example-tmp-'));
		try {
			await generateFromPackageSummary({
				package: {
					package: '@test/testpkg',
					path: FIXTURE_PATH,
					configArguments: {
						// Singleton: a plain object id in the runtime config
						registry: { type: 'registry::Registry' },
						// Generic: requires a resolver function dispatching on ctx.typeArguments
						container: { type: 'registry::Container' },
						// Function matcher: configures one function's parameter directly
						status: { function: 'registry::is_active' },
						// Package entry: overrides the address generated calls are sent to
						testpkgPackageId: { package: '@test/testpkg' },
					},
					generate: { modules: ['registry'] },
				},
				prune: true,
				outputDir: dir,
			});

			if (process.env.UPDATE_GENERATED_EXAMPLE) {
				await rm(EXAMPLE_DIR, { recursive: true, force: true });
				await cp(dir, EXAMPLE_DIR, { recursive: true });
				return;
			}

			const expected = await walk(EXAMPLE_DIR);
			const actual = await walk(dir);
			expect(actual, 'file set changed — rerun with UPDATE_GENERATED_EXAMPLE=1').toEqual(expected);

			for (const file of actual) {
				const [actualContent, expectedContent] = await Promise.all([
					readFile(join(dir, file), 'utf-8'),
					readFile(join(EXAMPLE_DIR, file), 'utf-8'),
				]);
				expect(
					actualContent,
					`${file} changed — rerun with UPDATE_GENERATED_EXAMPLE=1 to update the committed example`,
				).toBe(expectedContent);
			}
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
