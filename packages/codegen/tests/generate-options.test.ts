// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it } from 'vitest';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateFromPackageSummary } from '../src/index.js';
import type { PackageConfig, GenerateBase } from '../src/config.js';

const FIXTURE_PATH = join(__dirname, 'move/testpkg');

// Test fixture (generated from Move source via `sui move summary`):
//
// testpkg/counter module:
//   Structs: Counter (key), AdminCap (key+store), CounterCreated (copy+drop),
//            Primitives (all primitive field types), Composites (String, ID, vectors, Options),
//            Wrapper<T: store> (non-phantom generic), Pair<T: store, phantom U> (mixed generics)
//   Functions:
//     - create            (public, entry)
//     - increment         (public, &mut ref)
//     - value             (public, & ref, returns u64)
//     - set_value         (public, u64 param)
//     - value_with_clock  (public, well-known Clock param)
//     - set_optional      (public, Option<u64> param)
//     - batch_set         (public, vector<u64> param)
//     - wrap              (public, generic <T>)
//     - create_pair       (public, generic <T, U>)
//     - get_value_and_owner (public, multiple returns)
//     - reset             (private, entry)
//     - destroy           (private)
//
// testpkg/registry module:
//   Structs: Container<phantom T>, Registry, Entry (String/vector/enum fields), EntryRegistered
//   Enums:   Status (unit + named-field variants), Result<T> (generic enum)
//   Functions:
//     - register       (public, entry)
//     - lookup         (public)
//     - new_container  (public, generic)
//     - container_size (public, generic)
//     - is_active      (public, enum param)
//     - ok_result      (public, returns generic enum)
//     - admin_delete   (private)
//     - migrate        (private, entry)

async function generate(options: {
	generate?: PackageConfig['generate'] extends infer T ? T : never;
	globalGenerate?: GenerateBase;
	prune?: boolean;
}) {
	const outputDir = await mkdtemp(join(tmpdir(), 'codegen-test-'));

	const pkg: PackageConfig = {
		package: '@test/testpkg',
		path: FIXTURE_PATH,
		...(options.generate ? { generate: options.generate } : {}),
	};

	await generateFromPackageSummary({
		package: pkg,
		prune: options.prune ?? true,
		outputDir,
		globalGenerate: options.globalGenerate,
	});

	return outputDir;
}

/**
 * Build a synthetic on-chain summary by copying the local `testpkg` fixture into the layout
 * `sui move summary --package-id` actually produces. Real-world observation (mainnet SuiNS
 * upgraded from `0xd22b...` to `0x71af...`): the on-disk root package dir is named after
 * `root_package_original_id`, not the queried/latest id. The main-package detection therefore
 * needs to find that dir by elimination, not by matching the user's input.
 */
async function buildOnChainFixture(opts: {
	rootPackageId: string;
	rootPackageOriginalId?: string;
	dependencies?: Record<string, string>;
	typeOrigins?: Record<
		string,
		Array<{ module_name: string; datatype_name: string; package: string }>
	>;
}): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), 'codegen-onchain-'));
	const localSummaries = join(FIXTURE_PATH, 'package_summaries');
	const onDiskMainDir = opts.rootPackageOriginalId ?? opts.rootPackageId;

	await writeFile(
		join(path, 'root_package_metadata.json'),
		JSON.stringify({
			root_package_id: opts.rootPackageId,
			root_package_original_id: opts.rootPackageOriginalId ?? opts.rootPackageId,
			dependencies: opts.dependencies ?? {},
			...(opts.typeOrigins ? { type_origins: opts.typeOrigins } : {}),
		}),
	);
	await writeFile(
		join(path, 'address_mapping.json'),
		JSON.stringify({
			std: '0x0000000000000000000000000000000000000000000000000000000000000001',
			sui: '0x0000000000000000000000000000000000000000000000000000000000000002',
			testpkg: onDiskMainDir,
		}),
	);
	await mkdir(join(path, onDiskMainDir), { recursive: true });
	await cp(join(localSummaries, 'testpkg'), join(path, onDiskMainDir), { recursive: true });
	for (const depId of Object.keys(opts.dependencies ?? {})) {
		const depDir = join(path, depId);
		await mkdir(depDir, { recursive: true });
		const local =
			depId === '0x0000000000000000000000000000000000000000000000000000000000000001'
				? join(localSummaries, 'std')
				: join(localSummaries, 'sui');
		await cp(local, depDir, { recursive: true });
	}
	return path;
}

const LATEST_ID = '0x' + 'a'.repeat(64);
const V1_ID = '0x' + 'b'.repeat(64);
const STD_ID = '0x0000000000000000000000000000000000000000000000000000000000000001';
const SUI_ID = '0x0000000000000000000000000000000000000000000000000000000000000002';

async function getGeneratedFiles(outputDir: string): Promise<string[]> {
	const files: string[] = [];
	async function walk(dir: string, prefix: string) {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				await walk(join(dir, entry.name), relPath);
			} else {
				files.push(relPath);
			}
		}
	}
	await walk(outputDir, '');
	return files.sort();
}

async function getFileContent(outputDir: string, filePath: string): Promise<string> {
	return readFile(join(outputDir, filePath), 'utf-8');
}

/** Check if a generated file contains a function definition */
function hasFunction(content: string, name: string): boolean {
	return content.includes(`function ${name}(`);
}

/** Check if a generated file contains a BCS type definition (const export) */
function hasType(content: string, name: string): boolean {
	return content.includes(`const ${name} =`) || content.includes(`const ${name}:`);
}

let outputDir: string;

afterEach(async () => {
	if (outputDir) {
		await rm(outputDir, { recursive: true, force: true });
	}
});

describe('generate options', () => {
	describe('no generate option (defaults)', () => {
		it('generates all types and functions for all modules', async () => {
			outputDir = await generate({});
			const files = await getGeneratedFiles(outputDir);

			expect(files).toContain('testpkg/counter.ts');
			expect(files).toContain('testpkg/registry.ts');
			expect(files).toContain('utils/index.ts');

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasType(counter, 'Counter')).toBe(true);
			expect(hasType(counter, 'AdminCap')).toBe(true);
			expect(hasType(counter, 'CounterCreated')).toBe(true);
			expect(hasFunction(counter, 'create')).toBe(true);
			expect(hasFunction(counter, 'increment')).toBe(true);
			expect(hasFunction(counter, 'value')).toBe(true);
			expect(hasFunction(counter, 'setValue')).toBe(true);
			// Private entry included by default (privateMethods defaults to 'entry')
			expect(hasFunction(counter, 'reset')).toBe(true);
			// Private non-entry excluded by default
			expect(hasFunction(counter, 'destroy')).toBe(false);

			const registry = await getFileContent(outputDir, 'testpkg/registry.ts');
			expect(hasType(registry, 'Container')).toBe(true);
			expect(hasType(registry, 'Registry')).toBe(true);
			expect(hasType(registry, 'Entry')).toBe(true);
			expect(hasType(registry, 'EntryRegistered')).toBe(true);
			expect(hasType(registry, 'Status')).toBe(true);
			expect(hasFunction(registry, 'register')).toBe(true);
			expect(hasFunction(registry, 'lookup')).toBe(true);
			expect(hasFunction(registry, 'newContainer')).toBe(true);
			expect(hasFunction(registry, 'containerSize')).toBe(true);
			expect(hasFunction(registry, 'isActive')).toBe(true);
			// Private entry included by default
			expect(hasFunction(registry, 'migrate')).toBe(true);
			// Private non-entry excluded by default
			expect(hasFunction(registry, 'adminDelete')).toBe(false);
		});
	});

	describe('types option', () => {
		it('types: false skips all type generation', async () => {
			outputDir = await generate({
				generate: { types: false },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasType(counter, 'Counter')).toBe(false);
			expect(hasType(counter, 'AdminCap')).toBe(false);
			expect(hasType(counter, 'CounterCreated')).toBe(false);
			// Functions should still be generated (defaults to true)
			expect(hasFunction(counter, 'create')).toBe(true);
		});

		it('types: true generates all types', async () => {
			outputDir = await generate({
				generate: { types: true },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasType(counter, 'Counter')).toBe(true);
			expect(hasType(counter, 'AdminCap')).toBe(true);
			expect(hasType(counter, 'CounterCreated')).toBe(true);

			const registry = await getFileContent(outputDir, 'testpkg/registry.ts');
			expect(hasType(registry, 'Container')).toBe(true);
			expect(hasType(registry, 'Registry')).toBe(true);
			expect(hasType(registry, 'Entry')).toBe(true);
			expect(hasType(registry, 'Status')).toBe(true);
		});

		it('types: string[] is only valid at module level (via modules record)', async () => {
			outputDir = await generate({
				generate: {
					modules: {
						counter: { types: ['Counter'] },
					},
				},
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasType(counter, 'Counter')).toBe(true);
			expect(hasType(counter, 'AdminCap')).toBe(false);
			expect(hasType(counter, 'CounterCreated')).toBe(false);
		});
	});

	describe('functions option', () => {
		it('functions: false skips all function generation', async () => {
			outputDir = await generate({
				generate: { functions: false },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasFunction(counter, 'create')).toBe(false);
			expect(hasFunction(counter, 'increment')).toBe(false);
			expect(hasFunction(counter, 'value')).toBe(false);
			expect(hasFunction(counter, 'setValue')).toBe(false);
			expect(hasFunction(counter, 'reset')).toBe(false);
			expect(hasFunction(counter, 'destroy')).toBe(false);
			// Types should still be generated (defaults to true)
			expect(hasType(counter, 'Counter')).toBe(true);
		});

		it('functions: true generates public + entry functions', async () => {
			outputDir = await generate({
				generate: { functions: true },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasFunction(counter, 'create')).toBe(true);
			expect(hasFunction(counter, 'increment')).toBe(true);
			expect(hasFunction(counter, 'value')).toBe(true);
			expect(hasFunction(counter, 'setValue')).toBe(true);
			// Private entry included by default
			expect(hasFunction(counter, 'reset')).toBe(true);
			// Private non-entry excluded
			expect(hasFunction(counter, 'destroy')).toBe(false);
		});

		it('functions: { private: true } generates all functions including private', async () => {
			outputDir = await generate({
				generate: { functions: { private: true } },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasFunction(counter, 'create')).toBe(true);
			expect(hasFunction(counter, 'increment')).toBe(true);
			expect(hasFunction(counter, 'value')).toBe(true);
			expect(hasFunction(counter, 'setValue')).toBe(true);
			expect(hasFunction(counter, 'reset')).toBe(true);
			expect(hasFunction(counter, 'destroy')).toBe(true);

			const registry = await getFileContent(outputDir, 'testpkg/registry.ts');
			expect(hasFunction(registry, 'adminDelete')).toBe(true);
			expect(hasFunction(registry, 'migrate')).toBe(true);
		});

		it('functions: { private: false } generates only public functions', async () => {
			outputDir = await generate({
				generate: { functions: { private: false } },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasFunction(counter, 'create')).toBe(true);
			expect(hasFunction(counter, 'increment')).toBe(true);
			expect(hasFunction(counter, 'value')).toBe(true);
			expect(hasFunction(counter, 'setValue')).toBe(true);
			// Private entry excluded when private: false
			expect(hasFunction(counter, 'reset')).toBe(false);
			expect(hasFunction(counter, 'destroy')).toBe(false);
		});

		it("functions: { private: 'entry' } generates public + private entry", async () => {
			outputDir = await generate({
				generate: { functions: { private: 'entry' } },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasFunction(counter, 'create')).toBe(true);
			expect(hasFunction(counter, 'increment')).toBe(true);
			expect(hasFunction(counter, 'value')).toBe(true);
			expect(hasFunction(counter, 'reset')).toBe(true);
			expect(hasFunction(counter, 'destroy')).toBe(false);

			const registry = await getFileContent(outputDir, 'testpkg/registry.ts');
			expect(hasFunction(registry, 'migrate')).toBe(true);
			expect(hasFunction(registry, 'adminDelete')).toBe(false);
		});

		it('functions: string[] is only valid at module level (via modules record)', async () => {
			outputDir = await generate({
				generate: {
					modules: {
						counter: { functions: ['create', 'value'] },
					},
				},
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasFunction(counter, 'create')).toBe(true);
			expect(hasFunction(counter, 'value')).toBe(true);
			expect(hasFunction(counter, 'increment')).toBe(false);
			expect(hasFunction(counter, 'setValue')).toBe(false);
			expect(hasFunction(counter, 'reset')).toBe(false);
			expect(hasFunction(counter, 'destroy')).toBe(false);
		});

		it('functions: string[] can select private functions by name at module level', async () => {
			outputDir = await generate({
				generate: {
					modules: {
						counter: { functions: ['destroy'] },
					},
				},
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasFunction(counter, 'destroy')).toBe(true);
			expect(hasFunction(counter, 'create')).toBe(false);
		});
	});

	describe('modules option', () => {
		it('modules: string[] includes only listed modules with defaults', async () => {
			outputDir = await generate({
				generate: { modules: ['counter'] },
			});
			const files = await getGeneratedFiles(outputDir);

			expect(files).toContain('testpkg/counter.ts');
			expect(files).not.toContain('testpkg/registry.ts');

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasType(counter, 'Counter')).toBe(true);
			expect(hasType(counter, 'AdminCap')).toBe(true);
			expect(hasFunction(counter, 'create')).toBe(true);
			expect(hasFunction(counter, 'increment')).toBe(true);
		});

		it('modules: string[] with multiple modules', async () => {
			outputDir = await generate({
				generate: { modules: ['counter', 'registry'] },
			});
			const files = await getGeneratedFiles(outputDir);

			expect(files).toContain('testpkg/counter.ts');
			expect(files).toContain('testpkg/registry.ts');
		});

		it('modules: Record form defaults to false for unspecified fields', async () => {
			outputDir = await generate({
				generate: {
					modules: {
						counter: { types: ['Counter'] },
					},
				},
			});
			const files = await getGeneratedFiles(outputDir);

			expect(files).toContain('testpkg/counter.ts');
			expect(files).not.toContain('testpkg/registry.ts');

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasType(counter, 'Counter')).toBe(true);
			expect(hasType(counter, 'AdminCap')).toBe(false);
			// Functions default to false in record form
			expect(hasFunction(counter, 'create')).toBe(false);
		});

		it('modules: Record form with functions specified', async () => {
			outputDir = await generate({
				generate: {
					modules: {
						counter: { functions: ['increment', 'value'] },
					},
				},
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			// Types default to false in record form
			expect(hasType(counter, 'Counter')).toBe(false);
			expect(hasFunction(counter, 'increment')).toBe(true);
			expect(hasFunction(counter, 'value')).toBe(true);
			expect(hasFunction(counter, 'create')).toBe(false);
		});

		it('modules: Record form with both types and functions', async () => {
			outputDir = await generate({
				generate: {
					modules: {
						counter: { types: true, functions: { private: true } },
						registry: { types: ['Registry'] },
					},
				},
			});
			const files = await getGeneratedFiles(outputDir);

			expect(files).toContain('testpkg/counter.ts');
			expect(files).toContain('testpkg/registry.ts');

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasType(counter, 'Counter')).toBe(true);
			expect(hasType(counter, 'AdminCap')).toBe(true);
			expect(hasFunction(counter, 'create')).toBe(true);
			expect(hasFunction(counter, 'destroy')).toBe(true);

			const registry = await getFileContent(outputDir, 'testpkg/registry.ts');
			expect(hasType(registry, 'Registry')).toBe(true);
			expect(hasType(registry, 'Entry')).toBe(false);
			// Functions default to false in record form
			expect(hasFunction(registry, 'register')).toBe(false);
		});

		it('modules: Record form with true shorthand includes everything', async () => {
			outputDir = await generate({
				generate: {
					modules: {
						counter: true,
						registry: { types: ['Registry'] },
					},
				},
			});
			const files = await getGeneratedFiles(outputDir);

			expect(files).toContain('testpkg/counter.ts');
			expect(files).toContain('testpkg/registry.ts');

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			// true means include everything with package-level defaults
			expect(hasType(counter, 'Counter')).toBe(true);
			expect(hasType(counter, 'AdminCap')).toBe(true);
			expect(hasFunction(counter, 'create')).toBe(true);
			expect(hasFunction(counter, 'increment')).toBe(true);
			// Private entry included by default
			expect(hasFunction(counter, 'reset')).toBe(true);
			// Private non-entry excluded by default
			expect(hasFunction(counter, 'destroy')).toBe(false);

			const registry = await getFileContent(outputDir, 'testpkg/registry.ts');
			// Object form: unspecified fields default to false
			expect(hasType(registry, 'Registry')).toBe(true);
			expect(hasType(registry, 'Entry')).toBe(false);
			expect(hasFunction(registry, 'register')).toBe(false);
		});

		it('modules: Record form with enum type filtering', async () => {
			outputDir = await generate({
				generate: {
					modules: {
						registry: { types: ['Status', 'Entry'] },
					},
				},
			});

			const registry = await getFileContent(outputDir, 'testpkg/registry.ts');
			expect(hasType(registry, 'Status')).toBe(true);
			expect(hasType(registry, 'Entry')).toBe(true);
			expect(hasType(registry, 'Registry')).toBe(false);
			expect(hasType(registry, 'Container')).toBe(false);
		});

		it('modules: string[] with package-level functions override', async () => {
			outputDir = await generate({
				generate: {
					functions: { private: true },
					modules: ['counter'],
				},
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasFunction(counter, 'create')).toBe(true);
			expect(hasFunction(counter, 'destroy')).toBe(true);
		});

		it('modules: string[] with package-level types: false', async () => {
			outputDir = await generate({
				generate: {
					types: false,
					modules: ['counter'],
				},
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasType(counter, 'Counter')).toBe(false);
			expect(hasFunction(counter, 'create')).toBe(true);
		});
	});

	describe('globalGenerate option', () => {
		it('global types: false disables types for all packages', async () => {
			outputDir = await generate({
				globalGenerate: { types: false },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasType(counter, 'Counter')).toBe(false);
			expect(hasFunction(counter, 'create')).toBe(true);

			const registry = await getFileContent(outputDir, 'testpkg/registry.ts');
			expect(hasType(registry, 'Registry')).toBe(false);
			expect(hasType(registry, 'Status')).toBe(false);
		});

		it('global functions: false disables functions for all packages', async () => {
			outputDir = await generate({
				globalGenerate: { functions: false },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasType(counter, 'Counter')).toBe(true);
			expect(hasFunction(counter, 'create')).toBe(false);

			const registry = await getFileContent(outputDir, 'testpkg/registry.ts');
			expect(hasType(registry, 'Registry')).toBe(true);
			expect(hasFunction(registry, 'register')).toBe(false);
		});

		it('package-level generate overrides global generate', async () => {
			outputDir = await generate({
				globalGenerate: { functions: false },
				generate: { functions: true },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasFunction(counter, 'create')).toBe(true);
		});

		it('global functions: { private: true } applies to all packages', async () => {
			outputDir = await generate({
				globalGenerate: { functions: { private: true } },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasFunction(counter, 'destroy')).toBe(true);

			const registry = await getFileContent(outputDir, 'testpkg/registry.ts');
			expect(hasFunction(registry, 'adminDelete')).toBe(true);
		});
	});

	describe('globalGenerate functions.private option', () => {
		it('private: true includes all private functions', async () => {
			outputDir = await generate({
				globalGenerate: { functions: { private: true } },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasFunction(counter, 'destroy')).toBe(true);
			expect(hasFunction(counter, 'reset')).toBe(true);
		});

		it('private: false excludes all private functions', async () => {
			outputDir = await generate({
				globalGenerate: { functions: { private: false } },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasFunction(counter, 'create')).toBe(true);
			expect(hasFunction(counter, 'reset')).toBe(false);
			expect(hasFunction(counter, 'destroy')).toBe(false);
		});

		it("private: 'entry' includes only private entry functions", async () => {
			outputDir = await generate({
				globalGenerate: { functions: { private: 'entry' } },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasFunction(counter, 'reset')).toBe(true);
			expect(hasFunction(counter, 'destroy')).toBe(false);
		});
	});

	describe('combined options', () => {
		it('types: false + functions: false generates nothing for a module', async () => {
			outputDir = await generate({
				generate: { types: false, functions: false },
			});
			const files = await getGeneratedFiles(outputDir);

			expect(files).toContain('utils/index.ts');
			expect(files).not.toContain('testpkg/counter.ts');
			expect(files).not.toContain('testpkg/registry.ts');
		});

		it('selective types + selective functions per module', async () => {
			outputDir = await generate({
				generate: {
					modules: {
						counter: {
							types: ['Counter', 'CounterCreated'],
							functions: ['create', 'increment'],
						},
					},
				},
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			expect(hasType(counter, 'Counter')).toBe(true);
			expect(hasType(counter, 'CounterCreated')).toBe(true);
			expect(hasType(counter, 'AdminCap')).toBe(false);
			expect(hasFunction(counter, 'create')).toBe(true);
			expect(hasFunction(counter, 'increment')).toBe(true);
			expect(hasFunction(counter, 'value')).toBe(false);
			expect(hasFunction(counter, 'reset')).toBe(false);
		});

		it('mixed module and global generate options', async () => {
			outputDir = await generate({
				globalGenerate: { functions: { private: false } },
				generate: {
					modules: {
						counter: { types: true, functions: true },
						registry: { types: true },
					},
				},
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			// Module has functions: true, but global says private: false
			// However module-level functions: true inherits private behavior from global
			expect(hasType(counter, 'Counter')).toBe(true);
			expect(hasFunction(counter, 'create')).toBe(true);

			const registry = await getFileContent(outputDir, 'testpkg/registry.ts');
			expect(hasType(registry, 'Registry')).toBe(true);
			// Functions default to false in record form
			expect(hasFunction(registry, 'register')).toBe(false);
		});
	});

	describe('pruning', () => {
		it('prune: true excludes dependency modules from output', async () => {
			outputDir = await generate({ prune: true });
			const files = await getGeneratedFiles(outputDir);

			expect(files).toContain('testpkg/counter.ts');
			expect(files).toContain('testpkg/registry.ts');
			// Dependencies should not have standalone top-level files
			const topLevelFiles = files.filter(
				(f) => f.startsWith('testpkg/') && !f.startsWith('testpkg/deps/'),
			);
			expect(topLevelFiles.every((f) => f.match(/^testpkg\/(counter|registry)\.ts$/))).toBe(true);
		});

		it('prune: false includes dependency modules in deps/', { timeout: 30_000 }, async () => {
			outputDir = await generate({ prune: false });
			const files = await getGeneratedFiles(outputDir);

			expect(files).toContain('testpkg/counter.ts');
			expect(files).toContain('testpkg/registry.ts');
			// Dependencies should be generated in deps/
			expect(files.some((f) => f.startsWith('testpkg/deps/'))).toBe(true);
		});

		it('identifies main package by [addresses] label when it differs from [package].name', async () => {
			// Regression: a Move.toml with `[package].name = "managed_coin"` and
			// `[addresses].token_studio = "0x0"` keys its summary dir as `token_studio`.
			// The previous prune logic compared `pkgDir === packageName` ("managed_coin"),
			// pruning the main package's own modules.
			const fixturePath = await mkdtemp(join(tmpdir(), 'codegen-mismatched-'));
			const summaryDir = join(fixturePath, 'package_summaries');
			await mkdir(summaryDir, { recursive: true });

			await writeFile(
				join(fixturePath, 'Move.toml'),
				[
					'[package]',
					'name = "managed_coin"',
					'edition = "2024.beta"',
					'',
					'[addresses]',
					'token_studio = "0x0"',
					'',
				].join('\n'),
			);

			// Summary dir is keyed by the address label, not the package name.
			await cp(
				join(FIXTURE_PATH, 'package_summaries', 'testpkg'),
				join(summaryDir, 'token_studio'),
				{
					recursive: true,
				},
			);
			await cp(join(FIXTURE_PATH, 'package_summaries', 'std'), join(summaryDir, 'std'), {
				recursive: true,
			});
			await cp(join(FIXTURE_PATH, 'package_summaries', 'sui'), join(summaryDir, 'sui'), {
				recursive: true,
			});
			await writeFile(
				join(summaryDir, 'address_mapping.json'),
				JSON.stringify({
					std: '0x0000000000000000000000000000000000000000000000000000000000000001',
					sui: '0x0000000000000000000000000000000000000000000000000000000000000002',
					token_studio: '0x0000000000000000000000000000000000000000000000000000000000000000',
				}),
			);

			outputDir = await mkdtemp(join(tmpdir(), 'codegen-test-'));
			try {
				await generateFromPackageSummary({
					package: { package: '@test/managed_coin', path: fixturePath },
					prune: true,
					outputDir,
				});

				const files = await getGeneratedFiles(outputDir);
				// Output dir uses [package].name; main modules must be present (not pruned).
				expect(files).toContain('managed_coin/counter.ts');
				expect(files).toContain('managed_coin/registry.ts');
			} finally {
				await rm(fixturePath, { recursive: true, force: true });
			}
		});
	});

	describe('on-chain (upgraded) packages', () => {
		let onChainPath: string;

		afterEach(async () => {
			if (onChainPath) await rm(onChainPath, { recursive: true, force: true });
		});

		it('emits modules and uses original id for type names when queried by raw upgraded id', async () => {
			onChainPath = await buildOnChainFixture({
				rootPackageId: LATEST_ID,
				rootPackageOriginalId: V1_ID,
				dependencies: { [STD_ID]: STD_ID, [SUI_ID]: SUI_ID },
			});
			outputDir = await mkdtemp(join(tmpdir(), 'codegen-test-'));

			await generateFromPackageSummary({
				package: { package: LATEST_ID, packageName: 'testpkg', path: onChainPath },
				prune: true,
				outputDir,
			});

			const files = await getGeneratedFiles(outputDir);
			expect(files).toContain('testpkg/counter.ts');
			expect(files).toContain('testpkg/registry.ts');

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			// BCS type tags must use the *introducing* version, which here means original v1
			// (no per-type origins, so every type goes through the $moduleName fallback).
			expect(counter).toContain(`const $moduleName = '${V1_ID}::counter';`);
			// Function helpers should target the latest queried id so calls hit the upgrade.
			expect(counter).toContain(`options.package ?? '${LATEST_ID}'`);
		});

		it('uses original id for type names even when queried by MVR name', async () => {
			onChainPath = await buildOnChainFixture({
				rootPackageId: LATEST_ID,
				rootPackageOriginalId: V1_ID,
				dependencies: { [STD_ID]: STD_ID, [SUI_ID]: SUI_ID },
			});
			outputDir = await mkdtemp(join(tmpdir(), 'codegen-test-'));

			await generateFromPackageSummary({
				package: { package: '@test/testpkg', packageName: 'testpkg', path: onChainPath },
				prune: true,
				outputDir,
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			// MVR names resolve to the latest version at runtime — that wouldn't match on-chain
			// type tags for upgraded packages. Type names must always use the original id.
			expect(counter).toContain(`const $moduleName = '${V1_ID}::counter';`);
			// Function helpers can use the MVR name (it resolves to latest at call time).
			expect(counter).toContain(`options.package ?? '@test/testpkg'`);
		});

		it('inlines per-type origin addresses from type_origins (across multiple versions)', async () => {
			// Real metadata keys all of a package's entries under its `original_id`; the
			// introducing version of each individual type lives in the entry's `package` field.
			onChainPath = await buildOnChainFixture({
				rootPackageId: LATEST_ID,
				rootPackageOriginalId: V1_ID,
				dependencies: { [STD_ID]: STD_ID, [SUI_ID]: SUI_ID },
				typeOrigins: {
					[V1_ID]: [
						{ module_name: 'counter', datatype_name: 'Counter', package: V1_ID },
						{ module_name: 'counter', datatype_name: 'AdminCap', package: LATEST_ID },
					],
				},
			});
			outputDir = await mkdtemp(join(tmpdir(), 'codegen-test-'));

			await generateFromPackageSummary({
				package: { package: LATEST_ID, packageName: 'testpkg', path: onChainPath },
				prune: true,
				outputDir,
				globalGenerate: { types: true, functions: false },
			});

			const counter = await getFileContent(outputDir, 'testpkg/counter.ts');
			// Counter's origin equals the module's own address — falls through to $moduleName
			// (which is `${V1_ID}::counter`) instead of emitting a redundant inline prefix.
			expect(counter).toContain('name: `${$moduleName}::Counter`');
			expect(counter).toContain(`const $moduleName = '${V1_ID}::counter';`);
			// AdminCap's origin is the upgrade version — must be inlined since it differs.
			expect(counter).toContain(`name: \`${LATEST_ID}::counter::AdminCap\``);
		});

		it('passes per-dep type_origins through to dep modules (e.g. upgraded deps)', async () => {
			// std `option::Option` is at 0x1 in reality — pretend it was introduced at a
			// different address (some hypothetical earlier version) to verify the dep builder
			// honours the per-type origin from the metadata rather than always using its own
			// `summary.id.address`.
			const FAKE_STD_V0 = '0x' + 'c'.repeat(64);
			onChainPath = await buildOnChainFixture({
				rootPackageId: LATEST_ID,
				dependencies: { [STD_ID]: STD_ID, [SUI_ID]: SUI_ID },
				typeOrigins: {
					[STD_ID]: [{ module_name: 'option', datatype_name: 'Option', package: FAKE_STD_V0 }],
				},
			});
			outputDir = await mkdtemp(join(tmpdir(), 'codegen-test-'));

			await generateFromPackageSummary({
				package: { package: LATEST_ID, packageName: 'testpkg', path: onChainPath },
				prune: false,
				outputDir,
				globalGenerate: { types: true, functions: false },
			});

			const files = await getGeneratedFiles(outputDir);
			const optionFile = files.find((f) => f.endsWith('/option.ts'));
			expect(optionFile).toBeDefined();
			const content = await getFileContent(outputDir, optionFile!);
			expect(content).toContain(`name: \`${FAKE_STD_V0}::option::Option`);
		});

		it('throws when the on-disk listing is missing the root package dir', async () => {
			onChainPath = await mkdtemp(join(tmpdir(), 'codegen-onchain-'));
			await writeFile(
				join(onChainPath, 'root_package_metadata.json'),
				JSON.stringify({
					root_package_id: LATEST_ID,
					root_package_original_id: V1_ID,
				}),
			);
			await writeFile(join(onChainPath, 'address_mapping.json'), '{}');
			// No directories on disk — main dir match must fail.
			outputDir = await mkdtemp(join(tmpdir(), 'codegen-test-'));

			await expect(
				generateFromPackageSummary({
					package: { package: LATEST_ID, packageName: 'testpkg', path: onChainPath },
					prune: true,
					outputDir,
				}),
			).rejects.toThrow(/Main package dir .* not found/);
		});

		it("throws when root_package_metadata.json is missing 'root_package_id'", async () => {
			onChainPath = await mkdtemp(join(tmpdir(), 'codegen-onchain-'));
			await writeFile(join(onChainPath, 'root_package_metadata.json'), '{}');
			await writeFile(join(onChainPath, 'address_mapping.json'), '{}');
			outputDir = await mkdtemp(join(tmpdir(), 'codegen-test-'));

			await expect(
				generateFromPackageSummary({
					package: { package: LATEST_ID, packageName: 'testpkg', path: onChainPath },
					prune: true,
					outputDir,
				}),
			).rejects.toThrow(/root_package_id/);
		});
	});
});
