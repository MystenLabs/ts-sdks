// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';
import { Transaction } from '@mysten/sui/transactions';
import { ModuleRegistry } from '../src/module-registry.js';
import { MoveModuleBuilder } from '../src/move-module-builder.js';
import { parseConfigArguments } from '../src/config-arguments.js';
import { generateFromPackageSummary } from '../src/index.js';
import type { ConfigArguments } from '../src/config.js';

const FIXTURE_PATH = join(__dirname, 'move/testpkg');
const SUMMARIES_DIR = join(FIXTURE_PATH, 'package_summaries');
const GENERATED_DIR = join(__dirname, 'generated-config');

const ADDRESS_MAPPINGS = {
	std: '0x0000000000000000000000000000000000000000000000000000000000000001',
	sui: '0x0000000000000000000000000000000000000000000000000000000000000002',
	testpkg: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

async function createBuilders(configArguments: ConfigArguments, packageConfigKey?: string) {
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

	const { entries } = parseConfigArguments(configArguments, registry);
	counter.setConfigArguments(entries, packageConfigKey);
	registryBuilder.setConfigArguments(entries, packageConfigKey);

	return { counter, registry: registryBuilder, moduleRegistry: registry };
}

async function render(builder: MoveModuleBuilder) {
	await builder.renderFunctions();
	return builder.toString('./', './testpkg/test.ts');
}

/**
 * A synthetic module with a generic `Pool<phantom T>` type used by functions in generic,
 * concretely-instantiated, and same-type-twice positions.
 */
function poolsSummary({ parameterNames = true }: { parameterNames?: boolean } = {}) {
	const poolType = (typeArgument: unknown) => ({
		Reference: [
			false,
			{
				Datatype: {
					module: { address: 'testpkg', name: 'pools' },
					name: 'Pool',
					type_arguments: [{ phantom: true, argument: typeArgument }],
				},
			},
		],
	});
	const suiType = {
		Datatype: { module: { address: 'sui', name: 'sui' }, name: 'SUI', type_arguments: [] },
	};
	const param = (name: string, type_: unknown) => (parameterNames ? { name, type_ } : { type_ });
	const fn = (parameters: unknown[], type_parameters: unknown[] = []) => ({
		source_index: 0,
		index: 0,
		doc: '',
		attributes: [],
		visibility: 'Public',
		entry: false,
		macro_: false,
		type_parameters,
		parameters,
		return_: [],
	});

	return {
		id: { address: 'testpkg', name: 'pools' },
		doc: '',
		immediate_dependencies: [],
		attributes: [],
		functions: {
			use_generic: fn(
				[param('pool', poolType({ TypeParameter: 0 })), param('amount', 'u64')],
				[{ name: 'T', phantom: false, constraints: [] }],
			),
			use_concrete: fn([param('pool', poolType(suiType)), param('amount', 'u64')]),
			swap: fn(
				[
					param('base_pool', poolType({ TypeParameter: 0 })),
					param('quote_pool', poolType({ TypeParameter: 1 })),
				],
				[
					{ name: 'Base', phantom: false, constraints: [] },
					{ name: 'Quote', phantom: false, constraints: [] },
				],
			),
		},
		structs: {
			Pool: {
				index: 0,
				doc: '',
				attributes: [],
				abilities: ['Key'],
				type_parameters: [{ name: 'T', phantom: true, constraints: [] }],
				fields: {
					positional_fields: false,
					fields: { id: { index: 0, doc: null, type_: 'address' } },
				},
			},
		},
		enums: {},
	};
}

function createPoolsBuilder(
	configArguments: ConfigArguments,
	options: { parameterNames?: boolean } = {},
) {
	const registry = new ModuleRegistry(ADDRESS_MAPPINGS);
	const builder = new MoveModuleBuilder({
		summary: poolsSummary(options) as any,
		registry,
		mvrNameOrAddress: '@test/testpkg',
		importExtension: '.js',
	});
	const { entries } = parseConfigArguments(configArguments, registry);
	builder.setConfigArguments(entries);
	return builder;
}

describe('parseConfigArguments', () => {
	it('parses type, instantiated type, and package matchers', async () => {
		const registry = new ModuleRegistry(ADDRESS_MAPPINGS);
		new MoveModuleBuilder({
			summary: poolsSummary() as any,
			registry,
			mvrNameOrAddress: '@test/testpkg',
			importExtension: '.js',
		});

		const { entries, unresolvedKeys } = parseConfigArguments(
			{
				pool: { type: 'testpkg::pools::Pool' },
				suiPool: { type: 'testpkg::pools::Pool<0x2::sui::SUI>' },
				pkg: { package: '@test/testpkg' },
			},
			registry,
		);

		expect(unresolvedKeys).toEqual([]);
		expect(entries).toMatchObject([
			{
				kind: 'type',
				key: 'pool',
				module: 'pools',
				name: 'Pool',
				typeArguments: null,
				isGeneric: true,
			},
			{
				kind: 'type',
				key: 'suiPool',
				typeArguments: [
					{
						datatype: {
							address: '0x0000000000000000000000000000000000000000000000000000000000000002',
							module: 'sui',
							name: 'SUI',
							typeArguments: [],
						},
					},
				],
				isGeneric: true,
			},
			{ kind: 'package', key: 'pkg', package: '@test/testpkg' },
		]);
	});

	it('reports matchers for types that are not in the summaries as unresolved', async () => {
		const registry = new ModuleRegistry(ADDRESS_MAPPINGS);
		new MoveModuleBuilder({
			summary: poolsSummary() as any,
			registry,
			mvrNameOrAddress: '@test/testpkg',
			importExtension: '.js',
		});

		const { entries, unresolvedKeys } = parseConfigArguments(
			{
				missingType: { type: 'testpkg::pools::DoesNotExist' },
				missingModule: { type: '0x999::other::Thing' },
				pool: { type: 'testpkg::pools::Pool' },
			},
			registry,
		);

		expect(unresolvedKeys).toEqual(['missingType', 'missingModule']);
		expect(entries.map((entry) => entry.key)).toEqual(['pool']);
	});

	it('rejects malformed matcher types', async () => {
		const registry = new ModuleRegistry(ADDRESS_MAPPINGS);

		expect(() => parseConfigArguments({ bad: { type: 'Pool' } }, registry)).toThrowError(
			/Expected a fully-qualified Move type/,
		);
		expect(() => parseConfigArguments({ bad: { type: 'u64' } }, registry)).toThrowError(
			/must be a Move datatype/,
		);
	});

	it('rejects instantiated matchers with the wrong arity', async () => {
		const registry = new ModuleRegistry(ADDRESS_MAPPINGS);
		new MoveModuleBuilder({
			summary: poolsSummary() as any,
			registry,
			mvrNameOrAddress: '@test/testpkg',
			importExtension: '.js',
		});

		expect(() =>
			parseConfigArguments(
				{ pool: { type: 'testpkg::pools::Pool<0x2::sui::SUI, u64>' } },
				registry,
			),
		).toThrowError(/expects 1 type argument\(s\), got 2/);
	});
});

describe('config-driven function codegen', () => {
	it('non-generic matcher: matched parameter becomes optional with a required config slice', async () => {
		const { registry } = await createBuilders({
			registryObj: { type: 'testpkg::registry::Registry' },
		});
		registry.includeFunctions(['register']);
		const output = await render(registry);

		const argInterface = output.match(/export interface RegisterArguments[\s\S]*?^}/m);
		expect(argInterface?.[0]).toMatchInlineSnapshot(`
			"export interface RegisterArguments {
			    registry?: RawTransactionArgument<string>;
			    name: RawTransactionArgument<string>;
			    tags: RawTransactionArgument<Array<string>>;
			}"
		`);

		const optionsInterface = output.match(/export interface RegisterOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).toMatchInlineSnapshot(`
			"export interface RegisterOptions {
			    package?: string;
			    arguments: RegisterArguments | [
			        registry: RawTransactionArgument<string> | undefined,
			        name: RawTransactionArgument<string>,
			        tags: RawTransactionArgument<Array<string>>
			    ];
			    config: {
			        registryObj: ConfigValue;
			    };
			}"
		`);

		const fnBody = output.match(/export function register[\s\S]*?^}/m);
		expect(fnBody?.[0]).toMatchInlineSnapshot(`
			"export function register(options: RegisterOptions) {
			    const packageAddress = options.package ?? '@test/testpkg';
			    const argumentsTypes = [
			        null,
			        '0x1::string::String',
			        'vector<0x1::string::String>'
			    ] satisfies (string | null)[];
			    const parameterNames = ["registry", "name", "tags"];
			    return (tx: Transaction) => tx.moveCall({
			        package: packageAddress,
			        module: 'registry',
			        function: 'register',
			        arguments: normalizeMoveArguments(applyConfigArguments(options.arguments, [{ index: 0, name: "registry", resolve: () => resolveConfigArg(options.config.registryObj, { typeArguments: [] }, "registryObj") }]), argumentsTypes, parameterNames),
			    });
			}"
		`);
	});

	it('makes arguments optional when every parameter is config-matched', async () => {
		const { registry } = await createBuilders({
			registryObj: { type: 'testpkg::registry::Registry' },
		});
		registry.includeFunctions(['lookup']);
		const output = await render(registry);

		const optionsInterface = output.match(/export interface LookupOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).toMatchInlineSnapshot(`
			"export interface LookupOptions {
			    package?: string;
			    arguments?: LookupArguments | [
			        registry: RawTransactionArgument<string> | undefined
			    ];
			    config: {
			        registryObj: ConfigValue;
			    };
			}"
		`);

		const fnBody = output.match(/export function lookup[\s\S]*?^}/m);
		expect(fnBody?.[0]).toMatchInlineSnapshot(`
			"export function lookup(options: LookupOptions) {
			    const packageAddress = options.package ?? '@test/testpkg';
			    const argumentsTypes = [
			        null
			    ] satisfies (string | null)[];
			    const parameterNames = ["registry"];
			    return (tx: Transaction) => tx.moveCall({
			        package: packageAddress,
			        module: 'registry',
			        function: 'lookup',
			        arguments: normalizeMoveArguments(applyConfigArguments(options.arguments ?? {}, [{ index: 0, name: "registry", resolve: () => resolveConfigArg(options.config.registryObj, { typeArguments: [] }, "registryObj") }]), argumentsTypes, parameterNames),
			    });
			}"
		`);
	});

	it('uninstantiated generic matcher: config value requires a resolver and receives the parameter instantiation', async () => {
		const { registry } = await createBuilders({
			container: { type: 'testpkg::registry::Container' },
		});
		registry.includeFunctions(['container_size']);
		const output = await render(registry);

		const optionsInterface = output.match(/export interface ContainerSizeOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).toMatchInlineSnapshot(`
			"export interface ContainerSizeOptions {
			    package?: string;
			    arguments?: ContainerSizeArguments | [
			        container: RawTransactionArgument<string> | undefined
			    ];
			    config: {
			        container: (ctx: ConfigResolverContext) => string | TransactionObjectArgument;
			    };
			    typeArguments: [
			        string
			    ];
			}"
		`);

		const fnBody = output.match(/export function containerSize[\s\S]*?^}/m);
		expect(fnBody?.[0]).toMatchInlineSnapshot(`
			"export function containerSize(options: ContainerSizeOptions) {
			    const packageAddress = options.package ?? '@test/testpkg';
			    const argumentsTypes = [
			        null
			    ] satisfies (string | null)[];
			    const parameterNames = ["container"];
			    return (tx: Transaction) => tx.moveCall({
			        package: packageAddress,
			        module: 'registry',
			        function: 'container_size',
			        arguments: normalizeMoveArguments(applyConfigArguments(options.arguments ?? {}, [{ index: 0, name: "container", resolve: () => resolveConfigArg(options.config.container, { typeArguments: [\`\${options.typeArguments[0]}\`] }, "container") }]), argumentsTypes, parameterNames),
			        typeArguments: options.typeArguments
			    });
			}"
		`);
	});

	it('instantiated matcher only matches concrete instantiations and wins over the uninstantiated matcher', async () => {
		const builder = createPoolsBuilder({
			pool: { type: 'testpkg::pools::Pool' },
			suiPool: { type: 'testpkg::pools::Pool<0x2::sui::SUI>' },
		});
		builder.includeFunctions(['use_generic', 'use_concrete']);
		const output = await render(builder);

		// use_concrete is concretely typed Pool<SUI> in the Move signature: the instantiated
		// matcher wins and a plain value is allowed.
		const concreteOptions = output.match(/export interface UseConcreteOptions[\s\S]*?^}/m);
		expect(concreteOptions?.[0]).toMatchInlineSnapshot(`
			"export interface UseConcreteOptions {
			    package?: string;
			    arguments: UseConcreteArguments | [
			        pool: RawTransactionArgument<string> | undefined,
			        amount: RawTransactionArgument<number | bigint>
			    ];
			    config: {
			        suiPool: ConfigValue;
			    };
			}"
		`);

		const concreteBody = output.match(/export function useConcrete[\s\S]*?^}/m);
		expect(concreteBody?.[0]).toMatchInlineSnapshot(`
			"export function useConcrete(options: UseConcreteOptions) {
			    const packageAddress = options.package ?? '@test/testpkg';
			    const argumentsTypes = [
			        null,
			        'u64'
			    ] satisfies (string | null)[];
			    const parameterNames = ["pool", "amount"];
			    return (tx: Transaction) => tx.moveCall({
			        package: packageAddress,
			        module: 'pools',
			        function: 'use_concrete',
			        arguments: normalizeMoveArguments(applyConfigArguments(options.arguments, [{ index: 0, name: "pool", resolve: () => resolveConfigArg(options.config.suiPool, { typeArguments: ['0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'] }, "suiPool") }]), argumentsTypes, parameterNames),
			    });
			}"
		`);

		// use_generic is typed Pool<T>: it always binds to the uninstantiated matcher, which
		// requires a resolver function.
		const genericOptions = output.match(/export interface UseGenericOptions[\s\S]*?^}/m);
		expect(genericOptions?.[0]).toMatchInlineSnapshot(`
			"export interface UseGenericOptions {
			    package?: string;
			    arguments: UseGenericArguments | [
			        pool: RawTransactionArgument<string> | undefined,
			        amount: RawTransactionArgument<number | bigint>
			    ];
			    config: {
			        pool: (ctx: ConfigResolverContext) => string | TransactionObjectArgument;
			    };
			    typeArguments: [
			        string
			    ];
			}"
		`);

		const genericBody = output.match(/export function useGeneric[\s\S]*?^}/m);
		expect(genericBody?.[0]).toMatchInlineSnapshot(`
			"export function useGeneric(options: UseGenericOptions) {
			    const packageAddress = options.package ?? '@test/testpkg';
			    const argumentsTypes = [
			        null,
			        'u64'
			    ] satisfies (string | null)[];
			    const parameterNames = ["pool", "amount"];
			    return (tx: Transaction) => tx.moveCall({
			        package: packageAddress,
			        module: 'pools',
			        function: 'use_generic',
			        arguments: normalizeMoveArguments(applyConfigArguments(options.arguments, [{ index: 0, name: "pool", resolve: () => resolveConfigArg(options.config.pool, { typeArguments: [\`\${options.typeArguments[0]}\`] }, "pool") }]), argumentsTypes, parameterNames),
			        typeArguments: options.typeArguments
			    });
			}"
		`);
	});

	it('errors when a bare matcher hits two parameters in one signature', async () => {
		const builder = createPoolsBuilder({
			pool: { type: 'testpkg::pools::Pool' },
		});
		builder.includeFunctions(['swap']);

		await expect(render(builder)).rejects.toThrowError(
			/configArguments\.pool matches multiple parameters of testpkg::pools::swap \(base_pool, quote_pool\)/,
		);
	});

	it('name refinement disambiguates two parameters of the same type', async () => {
		const builder = createPoolsBuilder({
			basePool: { type: 'testpkg::pools::Pool', name: 'base_pool' },
			quotePool: { type: 'testpkg::pools::Pool', name: 'quote_pool' },
		});
		builder.includeFunctions(['swap']);
		const output = await render(builder);

		const optionsInterface = output.match(/export interface SwapOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).toMatchInlineSnapshot(`
			"export interface SwapOptions {
			    package?: string;
			    arguments?: SwapArguments | [
			        basePool: RawTransactionArgument<string> | undefined,
			        quotePool: RawTransactionArgument<string> | undefined
			    ];
			    config: {
			        basePool: (ctx: ConfigResolverContext) => string | TransactionObjectArgument;
			        quotePool: (ctx: ConfigResolverContext) => string | TransactionObjectArgument;
			    };
			    typeArguments: [
			        string,
			        string
			    ];
			}"
		`);

		const fnBody = output.match(/export function swap[\s\S]*?^}/m);
		expect(fnBody?.[0]).toMatchInlineSnapshot(`
			"export function swap(options: SwapOptions) {
			    const packageAddress = options.package ?? '@test/testpkg';
			    const argumentsTypes = [
			        null,
			        null
			    ] satisfies (string | null)[];
			    const parameterNames = ["basePool", "quotePool"];
			    return (tx: Transaction) => tx.moveCall({
			        package: packageAddress,
			        module: 'pools',
			        function: 'swap',
			        arguments: normalizeMoveArguments(applyConfigArguments(options.arguments ?? {}, [{ index: 0, name: "basePool", resolve: () => resolveConfigArg(options.config.basePool, { typeArguments: [\`\${options.typeArguments[0]}\`] }, "basePool") }, { index: 1, name: "quotePool", resolve: () => resolveConfigArg(options.config.quotePool, { typeArguments: [\`\${options.typeArguments[1]}\`] }, "quotePool") }]), argumentsTypes, parameterNames),
			        typeArguments: options.typeArguments
			    });
			}"
		`);
	});

	it('name-refined matchers win over a bare matcher for the same type', async () => {
		const builder = createPoolsBuilder({
			pool: { type: 'testpkg::pools::Pool' },
			basePool: { type: 'testpkg::pools::Pool', name: 'base_pool' },
			quotePool: { type: 'testpkg::pools::Pool', name: 'quote_pool' },
		});
		builder.includeFunctions(['swap', 'use_generic']);
		const output = await render(builder);

		// swap binds base/quote to the name-refined keys; use_generic still binds `pool`.
		const swapOptions = output.match(/export interface SwapOptions[\s\S]*?^}/m);
		expect(swapOptions?.[0]).toContain('basePool');
		expect(swapOptions?.[0]).toContain('quotePool');
		expect(swapOptions?.[0]).not.toContain('pool:');

		const genericOptions = output.match(/export interface UseGenericOptions[\s\S]*?^}/m);
		expect(genericOptions?.[0]).toContain('pool:');
	});

	it('errors when two matchers of equal specificity hit the same parameter', async () => {
		const builder = createPoolsBuilder({
			poolA: { type: 'testpkg::pools::Pool' },
			poolB: { type: 'testpkg::pools::Pool' },
		});
		builder.includeFunctions(['use_generic']);

		await expect(render(builder)).rejects.toThrowError(
			/matched by multiple configArguments entries with equal specificity: poolA, poolB/,
		);
	});

	it('errors when a name matcher targets a summary without parameter names', async () => {
		const builder = createPoolsBuilder(
			{ basePool: { type: 'testpkg::pools::Pool', name: 'base_pool' } },
			{ parameterNames: false },
		);
		builder.includeFunctions(['swap']);

		await expect(render(builder)).rejects.toThrowError(
			/parameters of testpkg::pools::swap have no names/,
		);
	});

	it('package entries are added to the package-address precedence chain', async () => {
		const { registry } = await createBuilders(
			{
				registryObj: { type: 'testpkg::registry::Registry' },
				testpkgAddress: { package: '@test/testpkg' },
			},
			'testpkgAddress',
		);
		registry.includeFunctions(['lookup']);
		const output = await render(registry);

		const fnBody = output.match(/export function lookup[\s\S]*?^}/m);
		expect(fnBody?.[0]).toContain(
			"const packageAddress = options.package ?? options.config.testpkgAddress ?? '@test/testpkg';",
		);
	});

	it('package entries alone produce an optional config slice', async () => {
		const { registry } = await createBuilders(
			{ testpkgAddress: { package: '@test/testpkg' } },
			'testpkgAddress',
		);
		registry.includeFunctions(['lookup']);
		const output = await render(registry);

		const optionsInterface = output.match(/export interface LookupOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).toMatchInlineSnapshot(`
			"export interface LookupOptions {
			    package?: string;
			    arguments: LookupArguments | [
			        registry: RawTransactionArgument<string>
			    ];
			    config?: {
			        testpkgAddress?: string;
			    };
			}"
		`);

		const fnBody = output.match(/export function lookup[\s\S]*?^}/m);
		expect(fnBody?.[0]).toContain(
			"const packageAddress = options.package ?? options.config?.testpkgAddress ?? '@test/testpkg';",
		);
	});

	it('keeps origin-addressed type tags while calls use the config-supplied package address', async () => {
		const ORIGIN_V1 = '0x000000000000000000000000000000000000000000000000000000000000aaaa';
		const registry = new ModuleRegistry(ADDRESS_MAPPINGS);
		const builder = await MoveModuleBuilder.fromSummaryFile(
			join(SUMMARIES_DIR, 'testpkg', 'registry.json'),
			registry,
			'@test/testpkg',
			'.js',
			false,
			{ Registry: ORIGIN_V1, Container: ORIGIN_V1 },
		);
		const { entries } = parseConfigArguments(
			{
				registryObj: { type: 'testpkg::registry::Registry' },
				testpkgAddress: { package: '@test/testpkg' },
			},
			registry,
		);
		builder.setConfigArguments(entries, 'testpkgAddress');
		builder.includeTypes(['Registry']);
		builder.includeFunctions(['lookup']);
		await builder.renderBCSTypes();
		const output = await render(builder);

		// BCS type names keep the origin address; the call package comes from the config chain.
		expect(output).toContain(`name: \`${ORIGIN_V1}::registry::Registry\``);
		expect(output).toContain(
			"const packageAddress = options.package ?? options.config.testpkgAddress ?? '@test/testpkg';",
		);
	});
});

describe('generateFromPackageSummary with configArguments', () => {
	afterAll(async () => {
		await rm(GENERATED_DIR, { recursive: true, force: true });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	async function generate() {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		await generateFromPackageSummary({
			package: {
				package: '@test/testpkg',
				path: FIXTURE_PATH,
				configArguments: {
					registryObj: { type: 'testpkg::registry::Registry' },
					container: { type: 'testpkg::registry::Container' },
					testpkgAddress: { package: '@test/testpkg' },
					missing: { type: 'testpkg::registry::DoesNotExist' },
				},
			},
			prune: true,
			outputDir: GENERATED_DIR,
		});
		return warn;
	}

	it('emits config-args.ts and config-driven bindings, warning on unresolved keys', async () => {
		const warn = await generate();

		expect(warn).toHaveBeenCalledWith(
			'configArguments keys not resolvable in @test/testpkg (skipped): missing',
		);

		const configArgs = await readFile(join(GENERATED_DIR, 'testpkg', 'config-args.ts'), 'utf-8');
		expect(configArgs).toMatchInlineSnapshot(`
			"/**************************************************************
			 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
			 **************************************************************/
			import { type ConfigValue, type ConfigResolverContext } from '../utils/index.js';
			import { type TransactionObjectArgument } from '@mysten/sui/transactions';
			export interface TestpkgConfig {
			    registryObj: ConfigValue;
			    container: (ctx: ConfigResolverContext) => string | TransactionObjectArgument;
			    testpkgAddress?: string;
			}"
		`);

		const registryModule = await readFile(join(GENERATED_DIR, 'testpkg', 'registry.ts'), 'utf-8');
		expect(registryModule).toContain('applyConfigArguments');
		expect(registryModule).toContain('resolveConfigArg');
	});

	it('generated output typechecks under strict settings', { timeout: 60_000 }, async () => {
		await generate();

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
		await walk(GENERATED_DIR);

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

	it('config values are applied at runtime, with explicit arguments overriding', async () => {
		await generate();

		const mod = await import(join(GENERATED_DIR, 'testpkg', 'registry.js'));
		const PACKAGE_ID = '0x00000000000000000000000000000000000000000000000000000000000000ee';
		const REGISTRY_ID = '0x0000000000000000000000000000000000000000000000000000000000000123';

		// Config-provided object id and package address.
		const tx = new Transaction();
		tx.add(
			mod.lookup({
				config: { registryObj: REGISTRY_ID, testpkgAddress: PACKAGE_ID },
			}),
		);
		const json = JSON.parse(await tx.toJSON());
		expect(json.inputs).toEqual([{ UnresolvedObject: { objectId: REGISTRY_ID } }]);
		expect(json.commands[0].MoveCall.package).toBe(PACKAGE_ID);

		// An explicitly passed argument overrides config resolution.
		const OVERRIDE_ID = '0x0000000000000000000000000000000000000000000000000000000000000456';
		const tx2 = new Transaction();
		tx2.add(
			mod.lookup({
				arguments: { registry: OVERRIDE_ID },
				config: {
					registryObj: () => {
						throw new Error('should not be called');
					},
					testpkgAddress: PACKAGE_ID,
				},
			}),
		);
		const json2 = JSON.parse(await tx2.toJSON());
		expect(json2.inputs).toEqual([{ UnresolvedObject: { objectId: OVERRIDE_ID } }]);
	});

	it('resolvers receive the matched parameter instantiation at runtime', async () => {
		await generate();

		const mod = await import(join(GENERATED_DIR, 'testpkg', 'registry.js'));
		const PACKAGE_ID = '0x00000000000000000000000000000000000000000000000000000000000000ee';
		const CONTAINER_ID = '0x0000000000000000000000000000000000000000000000000000000000000789';
		const contexts: unknown[] = [];

		const tx = new Transaction();
		tx.add(
			mod.containerSize({
				typeArguments: ['0x2::sui::SUI'],
				config: {
					container: (ctx: unknown) => {
						contexts.push(ctx);
						return CONTAINER_ID;
					},
					testpkgAddress: PACKAGE_ID,
				},
			}),
		);
		const json = JSON.parse(await tx.toJSON());

		expect(contexts).toEqual([{ typeArguments: ['0x2::sui::SUI'] }]);
		expect(json.inputs).toEqual([{ UnresolvedObject: { objectId: CONTAINER_ID } }]);
	});
});
