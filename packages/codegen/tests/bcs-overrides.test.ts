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
import type { BcsOverrides, ImportExtension } from '../src/config.js';
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

async function createBuilders(overrides: BcsOverrides, importExtension?: ImportExtension) {
	const registry = new ModuleRegistry(ADDRESS_MAPPINGS);
	const counter = await MoveModuleBuilder.fromSummaryFile(
		join(SUMMARIES_DIR, 'testpkg', 'counter.json'),
		registry,
		'@test/testpkg',
		importExtension,
	);
	const registryBuilder = await MoveModuleBuilder.fromSummaryFile(
		join(SUMMARIES_DIR, 'testpkg', 'registry.json'),
		registry,
		'@test/testpkg',
		importExtension,
	);

	const rules = parseBcsOverrides(overrides, registry, TESTPKG_CONTEXT);
	counter.setBcsOverrides(rules);
	registryBuilder.setBcsOverrides(rules);

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

/** Render the registry module with `overrides` applied to the listed types. */
async function renderRegistry(overrides: BcsOverrides, types: string[]) {
	const { registry } = await createBuilders(overrides);
	registry.includeTypes(types);
	return render(registry);
}

describe('bcsOverrides config schema', () => {
	it('accepts type/fields/source entries', () => {
		expect(() =>
			bcsOverridesSchema.parse([
				{ type: 'registry::Status', source: './bcs-fixtures/units.ts' },
				{ type: 'u64', source: './units.ts#ScaledU64' },
				{ type: 'u64', fields: 'Registry.count', source: './units.ts#ScaledU64' },
			]),
		).not.toThrow();
	});

	it('rejects unknown keys and missing fields', () => {
		expect(() => bcsOverridesSchema.parse([{ source: './units.ts' }])).toThrow();
		expect(() =>
			bcsOverridesSchema.parse([{ type: 'u64', name: 'X', source: './units.ts' }]),
		).toThrow();
		expect(() => bcsOverridesSchema.parse([{ type: 'u64', fields: 7, source: './u' }])).toThrow();
	});
});

describe('parseBcsOverrides', () => {
	it('replaces the declaration of a datatype written bare', () => {
		const [rule] = parse([{ type: 'registry::Status', source: './bcs-fixtures/units.ts' }]);
		expect(rule.declaration).toEqual({
			address: ADDRESS_MAPPINGS.testpkg,
			module: 'registry',
			name: 'Status',
		});
		// The default export name is the Move type name.
		expect(rule.source.exportName).toBe('Status');
	});

	it('substitutes at use sites for types with no declaration to replace', () => {
		// Primitives and vectors have no generated declaration...
		for (const type of ['u64', 'vector<u64>']) {
			expect(parse([{ type, source: './bcs-fixtures/units.ts#ScaledU64' }])[0].declaration).toBe(
				null,
			);
		}
		// ...nor do the stdlib types generated layouts serialize inline...
		for (const type of ['0x1::string::String', '0x1::option::Option', '0x2::object::ID']) {
			const [rule] = parse([{ type, source: './bcs-fixtures/units.ts#ScaledU64' }]);
			expect(rule.declaration, `${type} should substitute at use sites`).toBe(null);
		}
		// ...and a declaration exists once for all instantiations, so naming one targets uses.
		const [instantiated] = parse([
			{ type: 'registry::Result<u64>', source: './bcs-fixtures/units.ts#CustomResult' },
		]);
		expect(instantiated.declaration).toBe(null);
		// An instantiated datatype still derives its default export name from the Move type.
		expect(
			parse([{ type: 'registry::Container<0x2::sui::SUI>', source: './bcs-fixtures/units.ts' }])[0]
				.source.exportName,
		).toBe('Container');
	});

	it('never replaces a declaration when the entry is field-restricted', () => {
		const [rule] = parse([
			{ type: 'registry::Status', fields: 'Entry.status', source: './bcs-fixtures/units.ts' },
		]);
		expect(rule.declaration).toBe(null);
		expect(rule.where).toBeInstanceOf(RegExp);
	});

	it('does not error on entries that can never match', () => {
		// Minimal validation: a typo, an unknown type, and duplicate entries for one declaration are
		// all harmless — a shared override array is applied to packages that use only some of it.
		expect(() =>
			parse([
				{ type: 'registry::DoesNotExist', source: './bcs-fixtures/units.ts#ScaledU64' },
				{ type: 'registry::Status', source: './bcs-fixtures/units.ts' },
				{ type: '@test/testpkg::registry::Status', source: './bcs-fixtures/other.ts#ScaledU64' },
			]),
		).not.toThrow();
	});

	it('rejects genuinely unusable entries', () => {
		expect(() => parse([{ type: 'u64', source: './units.ts' }])).toThrow(
			/add "#ExportName" to the source/,
		);
		expect(() => parse([{ type: 'vector<u64>', source: './units.ts' }])).toThrow(
			/add "#ExportName" to the source/,
		);
		expect(() => parse([{ type: 'u64', source: '#ScaledU64' }])).toThrow(/empty import specifier/);
		expect(() => parse([{ type: 'u64', source: './units.ts#not valid' }])).toThrow(
			/is not a valid export name/,
		);
		expect(() => parse([{ type: 'u64', fields: '  ', source: './units.ts#ScaledU64' }])).toThrow(
			/"fields" is empty/,
		);
		expect(() => parse([{ type: 'registry::', source: './units.ts#ScaledU64' }])).toThrow(
			/Invalid type in matcher/,
		);
	});

	it('mentions named-address labels for unknown scopes', () => {
		expect(() =>
			parse([{ type: 'unknown_pkg::i64::I64', source: './bcs-fixtures/units.ts' }]),
		).toThrow(/Known named-address labels: std, sui, testpkg/);
	});

	it('passes bare package specifiers through and resolves relative ones', () => {
		expect(parse([{ type: 'u64', source: 'my-bcs-lib#Price' }])[0].source).toEqual({
			module: 'my-bcs-lib',
			exportName: 'Price',
		});
		expect(parse([{ type: 'u64', source: './bcs-fixtures/units.ts#ScaledU64' }])[0].source).toEqual(
			{ module: join(__dirname, 'bcs-fixtures/units.ts'), exportName: 'ScaledU64' },
		);
	});
});

describe('rendering with bcsOverrides', () => {
	it('reaches types nested inside vector and option', async () => {
		// The whole point of resolving inside the type renderer: it recurses, so an override on
		// `u64` applies to the `u64` inside `vector<u64>` and `Option<u64>` with no extra matching.
		const { counter } = await createBuilders([
			{ type: 'u64', source: './bcs-fixtures/units.ts#ScaledU64' },
		]);
		counter.includeTypes(['Composites', 'Primitives']);
		const output = await render(counter);

		expect(output).toContain(`import { ScaledU64 } from '../../bcs-fixtures/units.js'`);
		expect(output).toMatch(/val_u64:\s*ScaledU64/);
		expect(output).toMatch(/val_vector_u64:\s*bcs\.vector\(ScaledU64\)/);
		expect(output).toMatch(/val_option_u64:\s*bcs\.option\(ScaledU64\)/);
		expect(output).toMatch(/val_vector_option:\s*bcs\.vector\(bcs\.option\(ScaledU64\)\)/);
		// Fields of other types are untouched.
		expect(output).toMatch(/val_u8:\s*bcs\.u8\(\)/);
		expect(output).toMatch(/val_u128:\s*bcs\.u128\(\)/);
		expect(output).toMatch(/val_vector_u8:\s*bcs\.vector\(bcs\.u8\(\)\)/);
	});

	it('prefers a whole-type override over its element type', async () => {
		const { counter } = await createBuilders([
			{ type: 'u64', source: './bcs-fixtures/units.ts#ScaledU64' },
			{ type: 'vector<u64>', source: './bcs-fixtures/units.ts#ScaledU64Vector' },
		]);
		counter.includeTypes(['Composites']);
		const output = await render(counter);

		// `vector<u64>` matches the outer type first, so the element override never applies there.
		expect(output).toMatch(/val_vector_u64:\s*ScaledU64Vector/);
		expect(output).toMatch(/val_option_u64:\s*bcs\.option\(ScaledU64\)/);
	});

	it('replaces a declaration and leaves reference sites unchanged', async () => {
		const output = await renderRegistry(
			[{ type: 'registry::Status', source: './bcs-fixtures/units.ts' }],
			['Status', 'Entry'],
		);

		expect(output).toContain(`import { Status as Status_1 } from '../../bcs-fixtures/units.js'`);
		expect(output).toContain('export const Status = Status_1');
		expect(output).not.toContain('MoveEnum');
		// Entry's field keeps referencing the declaration, which is now the custom type.
		expect(output).toMatch(/status:\s*Status[,\s]/);
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

		const rules = parseBcsOverrides(
			[{ type: 'math::I64', source: './bcs-fixtures/units.ts#ScaledU64' }],
			registry,
			TESTPKG_CONTEXT,
		);
		math.setBcsOverrides(rules);
		order.setBcsOverrides(rules);

		order.includeTypes(['Order']);
		const orderOutput = await render(order);
		const mathOutput = await render(math);

		expect(orderOutput).toMatch(/price:\s*math\.I64/);
		expect(mathOutput).toContain(`import { ScaledU64 } from '../../bcs-fixtures/units.js'`);
		expect(mathOutput).toContain('export const I64 = ScaledU64');
		expect(mathOutput).not.toContain('MoveStruct');
	});

	it('replaces enum variant fields', async () => {
		const output = await renderRegistry(
			[{ type: 'u64', source: './bcs-fixtures/units.ts#ScaledU64' }],
			['Result'],
		);

		expect(output).toMatch(/code:\s*ScaledU64/);
		// The Ok variant's generic value field is untouched.
		expect(output).toMatch(/value:\s*typeParameters\[0\]/);
	});

	describe('fields globs', () => {
		const scaled = (fields: string) => [
			{ type: 'u64', fields, source: './bcs-fixtures/units.ts#ScaledU64' },
		];

		it('matches an exact module-qualified site', async () => {
			const output = await renderRegistry(scaled('registry::Registry.count'), [
				'Registry',
				'Result',
			]);
			expect(output).toMatch(/count:\s*ScaledU64/);
			// The Err variant's u64 is a different site.
			expect(output).toMatch(/code:\s*bcs\.u64\(\)/);
		});

		it('matches a leading wildcard without naming the module', async () => {
			const { counter } = await createBuilders(scaled('Primitives.*_u64'));
			counter.includeTypes(['Primitives']);
			const output = await render(counter);
			expect(output).toMatch(/val_u64:\s*ScaledU64/);
			expect(output).toMatch(/val_u128:\s*bcs\.u128\(\)/);
		});

		it('matches a trailing wildcard', async () => {
			const output = await renderRegistry(scaled('Registry.co*'), ['Registry', 'Result']);
			expect(output).toMatch(/count:\s*ScaledU64/);
			expect(output).toMatch(/code:\s*bcs\.u64\(\)/);
		});

		it('matches a module-wide wildcard, including enum variant fields', async () => {
			const output = await renderRegistry(scaled('registry::*.*'), ['Registry', 'Result']);
			expect(output).toMatch(/count:\s*ScaledU64/);
			// `registry::Result.Err.code` — a variant field path still lives under the module glob.
			expect(output).toMatch(/code:\s*ScaledU64/);
		});

		it('does not match sites in another module', async () => {
			const { counter } = await createBuilders(scaled('registry::*.*'));
			counter.includeTypes(['Primitives']);
			expect(await render(counter)).toMatch(/val_u64:\s*bcs\.u64\(\)/);
		});

		it('restricts a datatype override to the matched sites', async () => {
			const output = await renderRegistry(
				[{ type: 'registry::Status', fields: 'Entry.status', source: './bcs-fixtures/units.ts' }],
				['Status', 'Entry'],
			);
			// The declaration is still generated; only the matched field site is substituted.
			expect(output).toContain('MoveEnum');
			expect(output).toMatch(/status:\s*Status_1/);
		});
	});

	it('applies the first matching rule, in declaration order', async () => {
		const broad = { type: 'u64', source: './bcs-fixtures/units.ts#ScaledU64' };
		const narrow = {
			type: 'u64',
			fields: 'registry::Registry.count',
			source: './bcs-fixtures/other.ts#ScaledU64',
		};

		// No specificity scoring: the field-restricted rule loses purely by being declared second.
		// Both rules import `ScaledU64`, so the winner is identified by the module it came from.
		const first = await renderRegistry([broad, narrow], ['Registry']);
		expect(first).toContain(`import { ScaledU64 } from '../../bcs-fixtures/units.js'`);
		expect(first).toMatch(/count:\s*ScaledU64[,\s]/);

		const second = await renderRegistry([narrow, broad], ['Registry']);
		expect(second).toContain(`import { ScaledU64 } from '../../bcs-fixtures/other.js'`);
		expect(second).toMatch(/count:\s*ScaledU64[,\s]/);
	});

	it('imports the named export from a "#ExportName" fragment', async () => {
		// Without a fragment this declaration replacement would import the Move type name, `Result`.
		const output = await renderRegistry(
			[{ type: 'registry::Result', source: './bcs-fixtures/units.ts#CustomResult' }],
			['Result'],
		);
		expect(output).toContain(`import { CustomResult } from '../../bcs-fixtures/units.js'`);
		expect(output).toContain('export const Result = CustomResult');
	});

	it('rewrites the source extension to the run importExtension', async () => {
		for (const [extension, expected] of [
			['.ts', 'units.ts'],
			['', 'units'],
		] as const) {
			const { registry } = await createBuilders(
				[{ type: 'registry::Status', source: './bcs-fixtures/units.ts' }],
				extension,
			);
			registry.includeTypes(['Status']);
			expect(await render(registry)).toContain(`from '../../bcs-fixtures/${expected}'`);
		}
	});

	it('de-conflicts custom imports against each other and generated names', async () => {
		const output = await renderRegistry(
			[
				{ type: 'u64', source: './bcs-fixtures/units.ts#ScaledU64' },
				// Same export name from a different module, and a name that collides with the
				// generated `bcs` import.
				{ type: 'address', source: './bcs-fixtures/other.ts#ScaledU64' },
				{ type: 'vector<0x1::string::String>', source: './bcs-fixtures/other.ts#bcs' },
			],
			['Registry', 'Entry', 'Result'],
		);

		expect(output).toContain(`import { ScaledU64 } from '../../bcs-fixtures/units.js'`);
		expect(output).toContain(
			`import { ScaledU64 as ScaledU64_1, bcs as bcs_1 } from '../../bcs-fixtures/other.js'`,
		);
		expect(output).toMatch(/count:\s*ScaledU64[,\s]/);
		expect(output).toMatch(/owner:\s*ScaledU64_1/);
		expect(output).toMatch(/tags:\s*bcs_1/);
		// The generated `bcs` import still resolves to @mysten/sui/bcs.
		expect(output).toMatch(/import \{ bcs[,\s][^}]*\} from '@mysten\/sui\/bcs'/);
		expect(output).toMatch(/name:\s*bcs\.string\(\)/);
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
					{ type: 'u64', fields: 'Registry.count', source: './bcs-fixtures/units.ts#ScaledU64' },
					// No field in the package has this type — a shared override array applied to
					// several packages will always contain entries some of them never use.
					{ type: 'vector<u256>', source: './bcs-fixtures/units.ts#ScaledU64Vector' },
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

		// The `fields` restriction keeps every other u64 in the package untouched.
		const counterModule = await readFile(join(dir, 'testpkg', 'counter.ts'), 'utf-8');
		expect(counterModule).toMatch(/value:\s*bcs\.u64\(\)/);
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
