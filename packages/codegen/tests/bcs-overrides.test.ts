// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';
import { bcs } from '@mysten/sui/bcs';
import { ModuleRegistry } from '../src/module-registry.js';
import { MoveModuleBuilder } from '../src/move-module-builder.js';
import { parseBcsOverrides } from '../src/bcs-overrides.js';
import { generateFromPackageSummary } from '../src/index.js';
import { bcsOverridesSchema } from '../src/config.js';
import type { BcsOverrides } from '../src/config.js';
import type { ModuleSummary } from '../src/types/summary.js';

const FIXTURE_PATH = join(__dirname, 'move/testpkg');
const SUMMARIES_DIR = join(FIXTURE_PATH, 'package_summaries');

const ADDRESS_MAPPINGS = {
	std: '0x0000000000000000000000000000000000000000000000000000000000000001',
	sui: '0x0000000000000000000000000000000000000000000000000000000000000002',
	testpkg: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

const TESTPKG_CONTEXT = {
	package: { id: '@test/testpkg', address: ADDRESS_MAPPINGS.testpkg },
	configDir: __dirname,
};

async function createBuilders(overrides: BcsOverrides) {
	const registry = new ModuleRegistry(ADDRESS_MAPPINGS);
	const counter = await MoveModuleBuilder.fromSummaryFile(
		join(SUMMARIES_DIR, 'testpkg', 'counter.json'),
		registry,
		'@test/testpkg',
	);
	const registryBuilder = await MoveModuleBuilder.fromSummaryFile(
		join(SUMMARIES_DIR, 'testpkg', 'registry.json'),
		registry,
		'@test/testpkg',
	);

	const { entries } = parseBcsOverrides(overrides, registry, TESTPKG_CONTEXT);
	counter.setBcsOverrides(entries);
	registryBuilder.setBcsOverrides(entries);

	return { counter, registry: registryBuilder, moduleRegistry: registry };
}

async function render(builder: MoveModuleBuilder) {
	await builder.renderBCSTypes();
	// A fixed location under tests/ keeps the relative custom-source imports deterministic.
	return builder.toString(join(__dirname, 'out'), 'testpkg/module.ts');
}

function parse(overrides: BcsOverrides) {
	const registry = new ModuleRegistry(ADDRESS_MAPPINGS);
	return parseBcsOverrides(overrides, registry, TESTPKG_CONTEXT);
}

describe('bcsOverrides config schema', () => {
	it('accepts both entry forms', () => {
		expect(() =>
			bcsOverridesSchema.parse([
				{ type: 'registry::Status', source: './bcs-fixtures/units.ts' },
				{ type: 'u64', fields: 'registry::Registry.count', source: './units.ts#ScaledU64' },
			]),
		).not.toThrow();
	});

	it('rejects unknown keys and missing fields', () => {
		expect(() => bcsOverridesSchema.parse([{ source: './units.ts' }])).toThrow();
		expect(() =>
			bcsOverridesSchema.parse([{ type: 'u64', name: 'X', source: './units.ts' }]),
		).toThrow();
	});
});

describe('parseBcsOverrides', () => {
	it('treats a pure type without a fields pattern as every field site', () => {
		const { entries } = parse([{ type: 'u64', source: './bcs-fixtures/units.ts#ScaledU64' }]);
		expect(entries).toHaveLength(1);
		expect(entries[0].kind).toBe('field');
		expect(entries[0]).toMatchObject({ specificity: 0 });
		expect(() =>
			parse([{ type: 'vector<u64>', source: './bcs-fixtures/units.ts#ScaledU64' }]),
		).not.toThrow();
	});

	it('rejects instantiated declaration replacements', async () => {
		const { moduleRegistry } = await createBuilders([]);
		expect(() =>
			parseBcsOverrides(
				[{ type: 'registry::Result<u64>', source: './bcs-fixtures/units.ts#CustomResult' }],
				moduleRegistry,
				TESTPKG_CONTEXT,
			),
		).toThrow(/write the type without type arguments/);
	});

	it('errors for declaration replacements of unknown types', async () => {
		const { moduleRegistry } = await createBuilders([]);
		expect(() =>
			parseBcsOverrides(
				[{ type: 'registry::DoesNotExist', source: './bcs-fixtures/units.ts#ScaledU64' }],
				moduleRegistry,
				TESTPKG_CONTEXT,
			),
		).toThrow(/was not found in this package's summaries/);
	});

	it('errors for duplicate declaration replacements', async () => {
		const { moduleRegistry } = await createBuilders([]);
		expect(() =>
			parseBcsOverrides(
				[
					{ type: 'registry::Status', source: './bcs-fixtures/units.ts' },
					{ type: '@test/testpkg::registry::Status', source: './bcs-fixtures/units.ts' },
				],
				moduleRegistry,
				TESTPKG_CONTEXT,
			),
		).toThrow(/both replace the declaration/);
	});

	it('validates fields patterns', () => {
		const source = './bcs-fixtures/units.ts#ScaledU64';
		expect(() => parse([{ type: 'u64', fields: 'count', source }])).toThrow(
			/invalid fields pattern/,
		);
		expect(() => parse([{ type: 'u64', fields: 'registry::Registry', source }])).toThrow(
			/invalid fields pattern/,
		);
		expect(() => parse([{ type: 'u64', fields: 'registry::Registry.', source }])).toThrow(
			/invalid fields pattern/,
		);
		expect(() => parse([{ type: 'u64', fields: 'reg-istry::Registry.count', source }])).toThrow(
			/invalid fields pattern/,
		);
	});

	it('requires an export fragment for pure-type field entries', () => {
		expect(() =>
			parse([{ type: 'u64', fields: 'registry::Registry.count', source: './units.ts' }]),
		).toThrow(/add "#ExportName" to the source/);
	});

	it('rejects invalid export names', () => {
		expect(() =>
			parse([{ type: 'u64', fields: 'registry::Registry.count', source: './units.ts#not valid' }]),
		).toThrow(/is not a valid export name/);
	});

	it('mentions named-address labels for unknown scopes', () => {
		expect(() =>
			parse([{ type: 'unknown_pkg::i64::I64', source: './bcs-fixtures/units.ts' }]),
		).toThrow(/Known named-address labels: std, sui, testpkg/);
	});

	it('routes BCS-inlined types to field sites rather than a declaration', async () => {
		const { moduleRegistry } = await createBuilders([]);
		// These are serialized inline (`bcs.string()` / `bcs.option(...)` / `bcs.Address`) rather
		// than by reference, so there is no declaration to replace.
		for (const type of ['0x1::string::String', '0x1::option::Option', '0x2::object::ID']) {
			const { entries } = parseBcsOverrides(
				[{ type, source: './bcs-fixtures/units.ts#ScaledU64' }],
				moduleRegistry,
				TESTPKG_CONTEXT,
			);
			expect(entries[0].kind, `${type} should become a field override`).toBe('field');
		}
	});

	it('derives the default export name from an instantiated field type', async () => {
		const { moduleRegistry } = await createBuilders([]);
		const { entries } = parseBcsOverrides(
			[
				{
					type: 'registry::Container<0x2::sui::SUI>',
					fields: 'registry::Registry.count',
					source: './bcs-fixtures/units.ts',
				},
			],
			moduleRegistry,
			TESTPKG_CONTEXT,
		);
		expect(entries[0].source.exportName).toBe('Container');
	});
});

describe('rendering with bcsOverrides', () => {
	it('replaces an enum declaration and leaves reference sites unchanged', async () => {
		const { registry } = await createBuilders([
			{ type: 'registry::Status', source: './bcs-fixtures/units.ts' },
		]);
		registry.includeTypes(['Status', 'Entry']);
		const output = await render(registry);

		expect(output).toContain(`import { Status as Status_1 } from '../../bcs-fixtures/units.js'`);
		expect(output).toContain('export const Status = Status_1');
		expect(output).not.toContain('MoveEnum');
		// Entry's field keeps referencing the declaration, which is now the custom type.
		expect(output).toMatch(/status:\s*Status[,\s]/);
	});

	it('replaces matching field sites, filtered by field type', async () => {
		const { counter } = await createBuilders([
			{
				type: 'u64',
				fields: 'counter::Primitives.val_u*',
				source: './bcs-fixtures/units.ts#ScaledU64',
			},
		]);
		counter.includeTypes(['Primitives']);
		const output = await render(counter);

		expect(output).toContain(`import { ScaledU64 } from '../../bcs-fixtures/units.js'`);
		expect(output).toMatch(/val_u64:\s*ScaledU64/);
		// Other val_u* fields have different Move types and keep their generated schemas.
		expect(output).toMatch(/val_u8:\s*bcs\.u8\(\)/);
		expect(output).toMatch(/val_u128:\s*bcs\.u128\(\)/);
	});

	it('replaces vector-typed fields with an exact type match', async () => {
		const { counter } = await createBuilders([
			{
				type: 'vector<u64>',
				fields: 'counter::Composites.val_vector_*',
				source: './bcs-fixtures/units.ts#ScaledU64Vector',
			},
		]);
		counter.includeTypes(['Composites']);
		const output = await render(counter);

		expect(output).toMatch(/val_vector_u64:\s*ScaledU64Vector/);
		expect(output).toMatch(/val_vector_u8:\s*bcs\.vector\(bcs\.u8\(\)\)/);
	});

	it('replaces enum variant fields via variant.field patterns', async () => {
		const { registry } = await createBuilders([
			{
				type: 'u64',
				fields: 'registry::Result.Err.code',
				source: './bcs-fixtures/units.ts#ScaledU64',
			},
		]);
		registry.includeTypes(['Result']);
		const output = await render(registry);

		expect(output).toMatch(/code:\s*ScaledU64/);
		// The Ok variant's generic value field is untouched.
		expect(output).toMatch(/value:\s*typeParameters\[0\]/);
	});

	it('de-conflicts custom imports against each other and generated names', async () => {
		const { registry } = await createBuilders([
			{
				type: 'u64',
				fields: 'registry::Registry.count',
				source: './bcs-fixtures/units.ts#ScaledU64',
			},
			{
				type: 'address',
				fields: 'registry::Entry.owner',
				// Same export name from a different module, and a name that collides with the
				// generated `bcs` import.
				source: './bcs-fixtures/other.ts#ScaledU64',
			},
			{ type: 'u64', fields: 'registry::Result.Err.code', source: './bcs-fixtures/other.ts#bcs' },
		]);
		registry.includeTypes(['Registry', 'Entry', 'Result']);
		const output = await render(registry);

		expect(output).toContain(`import { ScaledU64 } from '../../bcs-fixtures/units.js'`);
		expect(output).toContain(
			`import { ScaledU64 as ScaledU64_1, bcs as bcs_1 } from '../../bcs-fixtures/other.js'`,
		);
		expect(output).toMatch(/count:\s*ScaledU64[,\s]/);
		expect(output).toMatch(/owner:\s*ScaledU64_1/);
		expect(output).toMatch(/code:\s*bcs_1/);
		// The generated `bcs` import still resolves to @mysten/sui/bcs.
		expect(output).toMatch(/import \{ bcs[,\s][^}]*\} from '@mysten\/sui\/bcs'/);
		expect(output).toMatch(/name:\s*bcs\.string\(\)/);
	});

	it('lets a narrower entry override a broader one', async () => {
		const { registry } = await createBuilders([
			// A blanket rule for every u64, with one field carved out.
			{ type: 'u64', source: './bcs-fixtures/units.ts#ScaledU64' },
			{
				type: 'u64',
				fields: 'registry::Registry.count',
				source: './bcs-fixtures/other.ts#ScaledU64',
			},
		]);
		registry.includeTypes(['Registry', 'Result']);
		const output = await render(registry);

		// The narrower entry wins for `count`; the broad rule still covers `code`. Which local name
		// each import gets depends on render order, so assert they differ rather than fixing names.
		const count = output.match(/count:\s*(\w+)/)?.[1];
		const code = output.match(/code:\s*(\w+)/)?.[1];
		expect(count).toBeDefined();
		expect(code).toBeDefined();
		expect(count).not.toBe(code);
		expect(output).toContain(`from '../../bcs-fixtures/units.js'`);
		expect(output).toContain(`from '../../bcs-fixtures/other.js'`);
	});

	it('errors when two entries match one field equally specifically', async () => {
		const { registry } = await createBuilders([
			// Both have one wildcard segment, so neither is more specific.
			{ type: 'u64', fields: 'registry::*.count', source: './units.ts#A' },
			{ type: 'u64', fields: '*::Registry.count', source: './units.ts#B' },
		]);
		expect(() => registry.includeTypes(['Registry'])).toThrow(
			/matched by multiple bcsOverrides entries with equal specificity/,
		);
	});

	it('replaces declarations referenced across modules', async () => {
		const registry = new ModuleRegistry(ADDRESS_MAPPINGS);
		const summary = (name: string, structs: ModuleSummary['structs']): ModuleSummary =>
			({
				id: { address: 'testpkg', name },
				doc: '',
				immediate_dependencies: [],
				attributes: [],
				functions: {},
				structs,
				enums: {},
			}) as unknown as ModuleSummary;

		const field = (type_: unknown) => ({ index: 0, doc: null, type_ });
		const struct = (fields: Record<string, unknown>) => ({
			index: 0,
			doc: '',
			attributes: [],
			abilities: [],
			type_parameters: [],
			fields: { positional_fields: false, fields },
		});

		const math = new MoveModuleBuilder({
			summary: summary('math', {
				I64: struct({ magnitude: field('u64'), is_negative: field('bool') }),
			} as unknown as ModuleSummary['structs']),
			registry,
		});
		const order = new MoveModuleBuilder({
			summary: summary('order', {
				Order: struct({
					price: field({
						Datatype: {
							module: { address: 'testpkg', name: 'math' },
							name: 'I64',
							type_arguments: [],
						},
					}),
				}),
			} as unknown as ModuleSummary['structs']),
			registry,
		});

		const { entries } = parseBcsOverrides(
			[{ type: 'math::I64', source: './bcs-fixtures/units.ts#ScaledU64' }],
			registry,
			TESTPKG_CONTEXT,
		);
		math.setBcsOverrides(entries);
		order.setBcsOverrides(entries);

		order.includeTypes(['Order']);
		const orderOutput = await render(order);
		const mathOutput = await render(math);

		expect(orderOutput).toMatch(/price:\s*math\.I64/);
		expect(mathOutput).toContain(`import { ScaledU64 } from '../../bcs-fixtures/units.js'`);
		expect(mathOutput).toContain('export const I64 = ScaledU64');
		expect(mathOutput).not.toContain('MoveStruct');
	});
});

describe('generateFromPackageSummary with bcsOverrides', () => {
	const generatedDirs: string[] = [];

	afterAll(async () => {
		await Promise.all(generatedDirs.map((dir) => rm(dir, { recursive: true, force: true })));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	async function tempOutputDir() {
		const dir = await mkdtemp(join(__dirname, 'generated-bcs-'));
		generatedDirs.push(dir);
		return dir;
	}

	async function generate() {
		const dir = await tempOutputDir();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		await generateFromPackageSummary({
			package: {
				package: '@test/testpkg',
				path: FIXTURE_PATH,
				bcsOverrides: [
					{ type: 'registry::Status', source: './bcs-fixtures/units.ts' },
					{
						type: 'u64',
						fields: 'registry::Registry.count',
						source: './bcs-fixtures/units.ts#ScaledU64',
					},
					{
						type: 'u64',
						fields: 'counter::Primitives.val_u*',
						source: './bcs-fixtures/units.ts#ScaledU64',
					},
					{
						type: 'u64',
						fields: 'counter::Counter.does_not_exist',
						source: './bcs-fixtures/units.ts#ScaledU64',
					},
				],
			},
			prune: true,
			outputDir: dir,
			configDir: __dirname,
		});
		return { warn, dir };
	}

	it('generates overridden modules, ignoring entries that match nothing', async () => {
		const { warn, dir } = await generate();

		// An entry that matches nothing is harmless — a config may legitimately declare a rule for
		// a type a given package has no fields of.
		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('bcsOverrides'));

		const registryModule = await readFile(join(dir, 'testpkg', 'registry.ts'), 'utf-8');
		expect(registryModule).toContain('export const Status = Status_1');
		expect(registryModule).toMatch(/count:\s*ScaledU64/);
	});

	it('generated output typechecks under strict settings', { timeout: 60_000 }, async () => {
		const { dir } = await generate();

		const files: string[] = [];
		const walk = async (dir: string) => {
			for (const entry of await readdir(dir, { withFileTypes: true })) {
				const path = join(dir, entry.name);
				if (entry.isDirectory()) {
					await walk(path);
				} else if (entry.name.endsWith('.ts')) {
					files.push(path);
				}
			}
		};
		await walk(dir);

		const program = ts.createProgram({
			rootNames: files,
			options: {
				target: ts.ScriptTarget.ES2020,
				module: ts.ModuleKind.NodeNext,
				moduleResolution: ts.ModuleResolutionKind.NodeNext,
				strict: true,
				noUncheckedIndexedAccess: true,
				noEmit: true,
				skipLibCheck: true,
				esModuleInterop: true,
				lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
			},
		});

		const diagnostics = ts
			.getPreEmitDiagnostics(program)
			.filter((diagnostic) => diagnostic.file && files.includes(diagnostic.file.fileName));

		const messages = diagnostics.map((diagnostic) => {
			const text = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
			if (diagnostic.file && diagnostic.start !== undefined) {
				const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
				return `[${diagnostic.file.fileName}:${line + 1}:${character + 1}] ${text}`;
			}
			return text;
		});

		expect(messages, `Generated output has type errors:\n${messages.join('\n')}`).toEqual([]);
	});

	it('applies custom transforms when parsing and serializing at runtime', async () => {
		const { dir } = await generate();
		const mod = await import(join(dir, 'testpkg', 'registry.js'));

		// Registry.count is replaced with a 1e9 fixed-point transform.
		const REGISTRY_ID = '0x0000000000000000000000000000000000000000000000000000000000000123';
		const bytes = mod.Registry.serialize({ id: REGISTRY_ID, count: 1.5 }).toBytes();
		const raw = bcs.struct('Registry', { id: bcs.Address, count: bcs.u64() }).parse(bytes);
		expect(raw.count).toBe('1500000000');
		expect(mod.Registry.parse(bytes).count).toBe(1.5);

		// Entry.status references the replaced Status declaration.
		const entryBytes = mod.Entry.serialize({
			name: 'first',
			owner: REGISTRY_ID,
			status: 'Active',
			tags: [],
		}).toBytes();
		expect(mod.Entry.parse(entryBytes).status).toBe('Active');
	});
});
