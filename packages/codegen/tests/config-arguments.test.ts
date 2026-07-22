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
import { configArgumentsSchema } from '../src/config.js';
import type { ConfigArguments } from '../src/config.js';

const FIXTURE_PATH = join(__dirname, 'move/testpkg');
const SUMMARIES_DIR = join(FIXTURE_PATH, 'package_summaries');
const GENERATED_DIR = join(__dirname, 'generated-config');

const ADDRESS_MAPPINGS = {
	std: '0x0000000000000000000000000000000000000000000000000000000000000001',
	sui: '0x0000000000000000000000000000000000000000000000000000000000000002',
	testpkg: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

const TESTPKG_CONTEXT = {
	package: { id: '@test/testpkg', address: ADDRESS_MAPPINGS.testpkg },
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

	const { entries } = parseConfigArguments({ global: configArguments }, registry, TESTPKG_CONTEXT);
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
 * concretely-instantiated, and same-type-twice positions, plus a `Coin` type used as a concrete
 * own-package type argument.
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
	const ownCoinType = {
		Datatype: { module: { address: 'testpkg', name: 'pools' }, name: 'Coin', type_arguments: [] },
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
			use_own_coin: fn([param('pool', poolType(ownCoinType)), param('amount', 'u64')]),
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
			Coin: {
				index: 1,
				doc: '',
				attributes: [],
				abilities: ['Store'],
				type_parameters: [],
				fields: {
					positional_fields: false,
					fields: { value: { index: 0, doc: null, type_: 'u64' } },
				},
			},
		},
		enums: {},
	};
}

function createPoolsBuilder(
	configArguments: ConfigArguments,
	options: { parameterNames?: boolean; typeOrigins?: Record<string, string> } = {},
) {
	const registry = new ModuleRegistry(ADDRESS_MAPPINGS);
	const builder = new MoveModuleBuilder({
		summary: poolsSummary(options) as any,
		registry,
		mvrNameOrAddress: '@test/testpkg',
		importExtension: '.js',
		typeOrigins: options.typeOrigins,
	});
	const { entries } = parseConfigArguments({ global: configArguments }, registry, TESTPKG_CONTEXT);
	builder.setConfigArguments(entries);
	return builder;
}

describe('configArguments schema', () => {
	it('rejects prototype-polluting keys', () => {
		// zod itself drops `__proto__` record keys; the others are rejected by the key schema.
		expect(
			Object.keys(configArgumentsSchema.parse({ ['__proto__']: { type: '0x2::sui::SUI' } })),
		).toEqual([]);
		expect(() =>
			configArgumentsSchema.parse({ constructor: { type: '0x2::sui::SUI' } }),
		).toThrowError(/prototype property names/);
		expect(() =>
			configArgumentsSchema.parse({ prototype: { type: '0x2::sui::SUI' } }),
		).toThrowError(/prototype property names/);
	});

	it('rejects matchers mixing type and package', () => {
		expect(() =>
			configArgumentsSchema.parse({ both: { type: '0x2::sui::SUI', package: '@x/y' } }),
		).toThrowError();
	});
});

describe('parseConfigArguments', () => {
	function createRegistry() {
		const registry = new ModuleRegistry(ADDRESS_MAPPINGS);
		new MoveModuleBuilder({
			summary: poolsSummary() as any,
			registry,
			mvrNameOrAddress: '@test/testpkg',
			importExtension: '.js',
		});
		return registry;
	}

	it('parses package-qualified, framework-qualified, and package matchers', async () => {
		const { entries } = parseConfigArguments(
			{
				global: {
					pool: { type: '@test/testpkg::pools::Pool' },
					suiPool: { type: '@test/testpkg::pools::Pool<0x2::sui::SUI>' },
					pkg: { package: '@test/testpkg' },
				},
			},
			createRegistry(),
			TESTPKG_CONTEXT,
		);

		expect(entries).toMatchObject([
			{
				kind: 'type',
				key: 'pool',
				source: 'global',
				address: '0x0000000000000000000000000000000000000000000000000000000000000000',
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

	it('resolves bare module::Type matchers against the declaring package', async () => {
		const { entries } = parseConfigArguments(
			{
				package: {
					pool: { type: 'pools::Pool' },
					coinPool: { type: 'pools::Pool<pools::Coin>' },
				},
			},
			createRegistry(),
			TESTPKG_CONTEXT,
		);

		expect(entries).toMatchObject([
			{
				key: 'pool',
				address: '0x0000000000000000000000000000000000000000000000000000000000000000',
				module: 'pools',
				name: 'Pool',
				typeArguments: null,
			},
			{
				key: 'coinPool',
				typeArguments: [
					{
						datatype: {
							address: '0x0000000000000000000000000000000000000000000000000000000000000000',
							module: 'pools',
							name: 'Coin',
						},
					},
				],
			},
		]);
	});

	it('requires package qualification for global matchers', async () => {
		expect(() =>
			parseConfigArguments(
				{ global: { pool: { type: 'pools::Pool' } } },
				createRegistry(),
				TESTPKG_CONTEXT,
			),
		).toThrowError(/must be qualified with a package in the global configArguments block/);
	});

	it('resolves other run packages through the packageAddresses map', async () => {
		const { entries } = parseConfigArguments(
			{ global: { pool: { type: '@other/pkg::pools::Pool' } } },
			createRegistry(),
			{
				...TESTPKG_CONTEXT,
				// @other/pkg resolves to the same summary package in this test closure.
				packageAddresses: { '@other/pkg': ADDRESS_MAPPINGS.testpkg },
			},
		);

		expect(entries).toMatchObject([{ key: 'pool', module: 'pools', name: 'Pool' }]);
	});

	it('merges package-scoped entries over global entries per key', async () => {
		const { entries } = parseConfigArguments(
			{
				global: {
					pool: { type: '@test/testpkg::pools::Pool' },
					coin: { type: '@test/testpkg::pools::Coin' },
				},
				package: {
					pool: { type: 'pools::Pool<0x2::sui::SUI>' },
				},
			},
			createRegistry(),
			TESTPKG_CONTEXT,
		);

		// Map insertion order keeps the global position for overridden keys.
		expect(entries).toMatchObject([
			{ key: 'pool', source: 'package', typeArguments: [{ datatype: { name: 'SUI' } }] },
			{ key: 'coin', source: 'global', typeArguments: [] },
		]);
	});

	it('skips matchers for run packages outside this dependency closure', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			// Global entries for other packages are silently inapplicable here (they are
			// validated when their own package is generated).
			const { entries } = parseConfigArguments(
				{ global: { other: { type: '@other/pkg::vault::Vault' } } },
				createRegistry(),
				{
					...TESTPKG_CONTEXT,
					packageAddresses: {
						'@other/pkg': '0x0000000000000000000000000000000000000000000000000000000000000042',
					},
				},
			);
			expect(entries).toEqual([]);
			expect(warn).not.toHaveBeenCalled();

			// A package-scoped entry referencing a package that is not a dependency can never
			// match, which deserves a warning.
			parseConfigArguments(
				{ package: { other: { type: '@other/pkg::vault::Vault' } } },
				createRegistry(),
				{
					...TESTPKG_CONTEXT,
					packageAddresses: {
						'@other/pkg': '0x0000000000000000000000000000000000000000000000000000000000000042',
					},
				},
			);
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('will never match'));
		} finally {
			warn.mockRestore();
		}
	});

	it('errors when the matched type does not exist in a package that is part of the closure', async () => {
		expect(() =>
			parseConfigArguments(
				{ global: { missing: { type: '@test/testpkg::pools::DoesNotExist' } } },
				createRegistry(),
				TESTPKG_CONTEXT,
			),
		).toThrowError(/was not found in its package's summaries/);
	});

	it('rejects malformed matcher types', async () => {
		const registry = createRegistry();
		const parse = (type: string) =>
			parseConfigArguments({ global: { bad: { type } } }, registry, TESTPKG_CONTEXT);

		expect(() => parse('Pool')).toThrowError(/Expected "module::Type"/);
		expect(() => parse('u64')).toThrowError(/must be a Move datatype/);
		expect(() => parse('@test/testpkg::pools::Pool<0x2::sui::SUI>>')).toThrowError(
			/unbalanced '>'/,
		);
		expect(() => parse('@test/testpkg::pools::Pool<0x2::sui::SUI')).toThrowError(/unbalanced '</);
		expect(() => parse('@test/testpkg::pools::Coin<>')).toThrowError(/empty type argument/);
		expect(() => parse('@test/testpkg::pools::Pool <0x2::sui::SUI>')).toThrowError(
			/is not a valid module::type pair/,
		);
		expect(() => parse('2::sui::SUI')).toThrowError(/Unknown package "2"/);
		expect(() => parse('@unknown/pkg::pools::Pool')).toThrowError(
			/Unknown package "@unknown\/pkg"/,
		);
	});

	it('rejects non-framework package addresses', async () => {
		const registry = createRegistry();
		const parse = (type: string) =>
			parseConfigArguments({ global: { bad: { type } } }, registry, TESTPKG_CONTEXT);

		expect(() => parse('0x999::vault::Vault')).toThrowError(
			/package addresses are network-specific/,
		);
		expect(() => parse('@test/testpkg::pools::Pool<0xabc123::coin::COIN>')).toThrowError(
			/package addresses are network-specific/,
		);
	});

	it('rejects partially instantiated matchers with a dedicated error', async () => {
		const registry = createRegistry();

		expect(() =>
			parseConfigArguments(
				{ global: { pool: { type: '@test/testpkg::pools::Pool<T>' } } },
				registry,
				TESTPKG_CONTEXT,
			),
		).toThrowError(/partially instantiated matchers are not supported/);

		// A nested uninstantiated generic is also a partial instantiation.
		expect(() =>
			parseConfigArguments(
				{ global: { pool: { type: '@test/testpkg::pools::Pool<@test/testpkg::pools::Pool>' } } },
				registry,
				TESTPKG_CONTEXT,
			),
		).toThrowError(/Partially instantiated matchers are not supported/);
	});

	it('rejects instantiated matchers with the wrong arity', async () => {
		expect(() =>
			parseConfigArguments(
				{ global: { pool: { type: '@test/testpkg::pools::Pool<0x2::sui::SUI, u64>' } } },
				createRegistry(),
				TESTPKG_CONTEXT,
			),
		).toThrowError(/expects 1 type argument\(s\), got 2/);
	});
});

describe('config-driven function codegen', () => {
	it('non-generic matcher: matched parameter becomes optional with an optional config slice', async () => {
		const { registry } = await createBuilders({
			registryObj: { type: '@test/testpkg::registry::Registry' },
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
			    config?: {
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
			        arguments: normalizeMoveArguments(applyConfigArguments(options.arguments, [{ index: 0, name: "registry", resolve: () => resolveConfigArgument(options.config?.registryObj, { typeArguments: [], packageAddress, moduleName: 'registry', functionName: 'register', parameterName: "registry" }, "registryObj") }]), argumentsTypes, parameterNames),
			    });
			}"
		`);
	});

	it('makes arguments optional and the tuple suffix optional when every parameter is config-matched', async () => {
		const { registry } = await createBuilders({
			registryObj: { type: '@test/testpkg::registry::Registry' },
		});
		registry.includeFunctions(['lookup']);
		const output = await render(registry);

		const optionsInterface = output.match(/export interface LookupOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).toMatchInlineSnapshot(`
			"export interface LookupOptions {
			    package?: string;
			    arguments?: LookupArguments | [
			        registry?: RawTransactionArgument<string>
			    ];
			    config?: {
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
			        arguments: normalizeMoveArguments(applyConfigArguments(options.arguments ?? {}, [{ index: 0, name: "registry", resolve: () => resolveConfigArgument(options.config?.registryObj, { typeArguments: [], packageAddress, moduleName: 'registry', functionName: 'lookup', parameterName: "registry" }, "registryObj") }]), argumentsTypes, parameterNames),
			    });
			}"
		`);
	});

	it('uninstantiated generic matcher: config value requires a resolver and receives the parameter instantiation', async () => {
		const { registry } = await createBuilders({
			container: { type: '@test/testpkg::registry::Container' },
		});
		registry.includeFunctions(['container_size']);
		const output = await render(registry);

		const optionsInterface = output.match(/export interface ContainerSizeOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).toMatchInlineSnapshot(`
			"export interface ContainerSizeOptions {
			    package?: string;
			    arguments?: ContainerSizeArguments | [
			        container?: RawTransactionArgument<string>
			    ];
			    config?: {
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
			        arguments: normalizeMoveArguments(applyConfigArguments(options.arguments ?? {}, [{ index: 0, name: "container", resolve: () => resolveConfigArgument(options.config?.container, { typeArguments: [\`\${options.typeArguments[0]}\`], packageAddress, moduleName: 'registry', functionName: 'container_size', parameterName: "container" }, "container") }]), argumentsTypes, parameterNames),
			        typeArguments: options.typeArguments
			    });
			}"
		`);
	});

	it('instantiated matcher only matches concrete instantiations and wins over the uninstantiated matcher', async () => {
		const builder = createPoolsBuilder({
			pool: { type: '@test/testpkg::pools::Pool' },
			suiPool: { type: '@test/testpkg::pools::Pool<0x2::sui::SUI>' },
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
			    config?: {
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
			        arguments: normalizeMoveArguments(applyConfigArguments(options.arguments, [{ index: 0, name: "pool", resolve: () => resolveConfigArgument(options.config?.suiPool, { typeArguments: ['0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'], packageAddress, moduleName: 'pools', functionName: 'use_concrete', parameterName: "pool" }, "suiPool") }]), argumentsTypes, parameterNames),
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
			    config?: {
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
			        arguments: normalizeMoveArguments(applyConfigArguments(options.arguments, [{ index: 0, name: "pool", resolve: () => resolveConfigArgument(options.config?.pool, { typeArguments: [\`\${options.typeArguments[0]}\`], packageAddress, moduleName: 'pools', functionName: 'use_generic', parameterName: "pool" }, "pool") }]), argumentsTypes, parameterNames),
			        typeArguments: options.typeArguments
			    });
			}"
		`);
	});

	it('resolver context tags for own-package types use the package name, not the placeholder address', async () => {
		const builder = createPoolsBuilder({
			pool: { type: '@test/testpkg::pools::Pool' },
		});
		builder.includeFunctions(['use_own_coin']);
		const output = await render(builder);

		const fnBody = output.match(/export function useOwnCoin[\s\S]*?^}/m);
		expect(fnBody?.[0]).toContain("typeArguments: ['@test/testpkg::pools::Coin']");
	});

	it('resolver context tags use origin addresses for upgraded packages', async () => {
		const ORIGIN_V1 = '0x000000000000000000000000000000000000000000000000000000000000aaaa';
		const builder = createPoolsBuilder(
			{ pool: { type: '@test/testpkg::pools::Pool' } },
			{ typeOrigins: { Coin: ORIGIN_V1 } },
		);
		builder.includeFunctions(['use_own_coin']);
		const output = await render(builder);

		const fnBody = output.match(/export function useOwnCoin[\s\S]*?^}/m);
		expect(fnBody?.[0]).toContain(`typeArguments: ['${ORIGIN_V1}::pools::Coin']`);
	});

	it('errors when a bare matcher hits two named parameters in one signature', async () => {
		const builder = createPoolsBuilder({
			pool: { type: '@test/testpkg::pools::Pool' },
		});
		builder.includeFunctions(['swap']);

		await expect(render(builder)).rejects.toThrowError(
			/configArguments\.pool matches multiple parameters of testpkg::pools::swap \(base_pool, quote_pool\)/,
		);
	});

	it('warns and skips config mapping when a bare matcher hits two nameless parameters', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			const builder = createPoolsBuilder(
				{ pool: { type: '@test/testpkg::pools::Pool' } },
				{ parameterNames: false },
			);
			builder.includeFunctions(['swap']);
			const output = await render(builder);

			expect(warn).toHaveBeenCalledWith(
				expect.stringContaining('configArguments.pool matches multiple parameters'),
			);
			// swap is still generated, without config mapping.
			const optionsInterface = output.match(/export interface SwapOptions[\s\S]*?^}/m);
			expect(optionsInterface?.[0]).not.toContain('config');
		} finally {
			warn.mockRestore();
		}
	});

	it('generates tuple-only bindings for nameless summaries with a matched parameter', async () => {
		const builder = createPoolsBuilder(
			{ pool: { type: '@test/testpkg::pools::Pool' } },
			{ parameterNames: false },
		);
		builder.includeFunctions(['use_generic']);
		const output = await render(builder);

		const optionsInterface = output.match(/export interface UseGenericOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).toMatchInlineSnapshot(`
			"export interface UseGenericOptions {
			    package?: string;
			    arguments: [
			        RawTransactionArgument<string> | undefined,
			        RawTransactionArgument<number | bigint>
			    ];
			    config?: {
			        pool: (ctx: ConfigResolverContext) => string | TransactionObjectArgument;
			    };
			    typeArguments: [
			        string
			    ];
			}"
		`);

		const fnBody = output.match(/export function useGeneric[\s\S]*?^}/m);
		expect(fnBody?.[0]).toMatchInlineSnapshot(`
			"export function useGeneric(options: UseGenericOptions) {
			    const packageAddress = options.package ?? '@test/testpkg';
			    const argumentsTypes = [
			        null,
			        'u64'
			    ] satisfies (string | null)[];
			    return (tx: Transaction) => tx.moveCall({
			        package: packageAddress,
			        module: 'pools',
			        function: 'use_generic',
			        arguments: normalizeMoveArguments(applyConfigArguments(options.arguments, [{ index: 0, resolve: () => resolveConfigArgument(options.config?.pool, { typeArguments: [\`\${options.typeArguments[0]}\`], packageAddress, moduleName: 'pools', functionName: 'use_generic' }, "pool") }]), argumentsTypes),
			        typeArguments: options.typeArguments
			    });
			}"
		`);
	});

	it('name refinement disambiguates two parameters of the same type', async () => {
		const builder = createPoolsBuilder({
			basePool: { type: '@test/testpkg::pools::Pool', parameterName: 'base_pool' },
			quotePool: { type: '@test/testpkg::pools::Pool', parameterName: 'quote_pool' },
		});
		builder.includeFunctions(['swap']);
		const output = await render(builder);

		const optionsInterface = output.match(/export interface SwapOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).toMatchInlineSnapshot(`
			"export interface SwapOptions {
			    package?: string;
			    arguments?: SwapArguments | [
			        basePool?: RawTransactionArgument<string>,
			        quotePool?: RawTransactionArgument<string>
			    ];
			    config?: {
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
			        arguments: normalizeMoveArguments(applyConfigArguments(options.arguments ?? {}, [{ index: 0, name: "basePool", resolve: () => resolveConfigArgument(options.config?.basePool, { typeArguments: [\`\${options.typeArguments[0]}\`], packageAddress, moduleName: 'pools', functionName: 'swap', parameterName: "base_pool" }, "basePool") }, { index: 1, name: "quotePool", resolve: () => resolveConfigArgument(options.config?.quotePool, { typeArguments: [\`\${options.typeArguments[1]}\`], packageAddress, moduleName: 'pools', functionName: 'swap', parameterName: "quote_pool" }, "quotePool") }]), argumentsTypes, parameterNames),
			        typeArguments: options.typeArguments
			    });
			}"
		`);
	});

	it('name-refined matchers win over a bare matcher for the same type', async () => {
		const builder = createPoolsBuilder({
			pool: { type: '@test/testpkg::pools::Pool' },
			basePool: { type: '@test/testpkg::pools::Pool', parameterName: 'base_pool' },
			quotePool: { type: '@test/testpkg::pools::Pool', parameterName: 'quote_pool' },
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
			poolA: { type: '@test/testpkg::pools::Pool' },
			poolB: { type: '@test/testpkg::pools::Pool' },
		});
		builder.includeFunctions(['use_generic']);

		await expect(render(builder)).rejects.toThrowError(
			/matched by multiple configArguments entries with equal specificity: poolA, poolB/,
		);
	});

	it('errors when a name matcher would apply to a nameless parameter and nothing else matches', async () => {
		const builder = createPoolsBuilder(
			{ basePool: { type: '@test/testpkg::pools::Pool', parameterName: 'base_pool' } },
			{ parameterNames: false },
		);
		builder.includeFunctions(['swap']);

		await expect(render(builder)).rejects.toThrowError(
			/parameters have no names \(bytecode summaries do not include parameter names\)/,
		);
	});

	it('does not error for a name matcher whose instantiation cannot match the nameless parameter', async () => {
		// The instantiated+named matcher targets Pool<SUI>; use_own_coin's parameter is
		// Pool<Coin>, so the matcher is filtered by instantiation before the nameless check.
		const builder = createPoolsBuilder(
			{
				suiPool: { type: '@test/testpkg::pools::Pool<0x2::sui::SUI>', parameterName: 'sui_pool' },
			},
			{ parameterNames: false },
		);
		builder.includeFunctions(['use_own_coin']);
		const output = await render(builder);

		const optionsInterface = output.match(/export interface UseOwnCoinOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).not.toContain('config');
	});

	it('falls back to a bare matcher instead of erroring when a name matcher hits a nameless parameter', async () => {
		const builder = createPoolsBuilder(
			{
				pool: { type: '@test/testpkg::pools::Pool' },
				basePool: { type: '@test/testpkg::pools::Pool', parameterName: 'base_pool' },
			},
			{ parameterNames: false },
		);
		builder.includeFunctions(['use_generic']);
		const output = await render(builder);

		const optionsInterface = output.match(/export interface UseGenericOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).toContain('pool:');
	});

	it('package entries are added to the package-address precedence chain', async () => {
		const { registry } = await createBuilders(
			{
				registryObj: { type: '@test/testpkg::registry::Registry' },
				testpkgAddress: { package: '@test/testpkg' },
			},
			'testpkgAddress',
		);
		registry.includeFunctions(['lookup']);
		const output = await render(registry);

		const fnBody = output.match(/export function lookup[\s\S]*?^}/m);
		expect(fnBody?.[0]).toContain(
			"const packageAddress = options.package ?? options.config?.testpkgAddress ?? '@test/testpkg';",
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
				global: {
					registryObj: { type: '@test/testpkg::registry::Registry' },
					testpkgAddress: { package: '@test/testpkg' },
				},
			},
			registry,
			TESTPKG_CONTEXT,
		);
		builder.setConfigArguments(entries, 'testpkgAddress');
		builder.includeTypes(['Registry']);
		builder.includeFunctions(['lookup']);
		await builder.renderBCSTypes();
		const output = await render(builder);

		// BCS type names keep the origin address; the call package comes from the config chain.
		expect(output).toContain(`name: \`${ORIGIN_V1}::registry::Registry\``);
		expect(output).toContain(
			"const packageAddress = options.package ?? options.config?.testpkgAddress ?? '@test/testpkg';",
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
			},
			prune: true,
			outputDir: GENERATED_DIR,
			configArguments: {
				registryObj: { type: '@test/testpkg::registry::Registry' },
				container: { type: '@test/testpkg::registry::Container' },
				testpkgAddress: { package: '@test/testpkg' },
				unusedEntry: { type: '@test/testpkg::registry::Entry' },
			},
		});
		return warn;
	}

	it('emits config-arguments.ts and config-driven bindings, warning on unused keys', async () => {
		const warn = await generate();

		// Entry is a plain store struct that no generated function takes as a parameter.
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining(
				'configArguments keys that matched no generated function parameters in @test/testpkg: unusedEntry',
			),
		);

		const configArgs = await readFile(
			join(GENERATED_DIR, 'testpkg', 'config-arguments.ts'),
			'utf-8',
		);
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
			    unusedEntry: ConfigValue;
			}"
		`);

		const registryModule = await readFile(join(GENERATED_DIR, 'testpkg', 'registry.ts'), 'utf-8');
		expect(registryModule).toContain('applyConfigArguments');
		expect(registryModule).toContain('resolveConfigArgument');
	});

	it('errors when a matcher references a type missing from its package', async () => {
		await expect(
			generateFromPackageSummary({
				package: {
					package: '@test/testpkg',
					path: FIXTURE_PATH,
					configArguments: {
						missing: { type: '@test/testpkg::registry::DoesNotExist' },
					},
				},
				prune: true,
				outputDir: GENERATED_DIR,
			}),
		).rejects.toThrowError(/was not found in its package's summaries/);
	});

	it('warns for unused keys in a package-scoped block', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		await generateFromPackageSummary({
			package: {
				package: '@test/testpkg',
				path: FIXTURE_PATH,
				configArguments: {
					unusedEntry: { type: '@test/testpkg::registry::Entry' },
				},
			},
			prune: true,
			outputDir: GENERATED_DIR,
		});

		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining(
				'configArguments keys that matched no generated function parameters in @test/testpkg: unusedEntry',
			),
		);
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

		// An explicitly passed argument overrides config resolution (object form).
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

		// Tuple form: an empty tuple resolves from config, an explicit tuple element overrides.
		const tx3 = new Transaction();
		tx3.add(
			mod.lookup({
				arguments: [],
				config: { registryObj: REGISTRY_ID, testpkgAddress: PACKAGE_ID },
			}),
		);
		const json3 = JSON.parse(await tx3.toJSON());
		expect(json3.inputs).toEqual([{ UnresolvedObject: { objectId: REGISTRY_ID } }]);

		const tx4 = new Transaction();
		tx4.add(
			mod.lookup({
				arguments: [OVERRIDE_ID],
				config: {
					registryObj: () => {
						throw new Error('should not be called');
					},
					testpkgAddress: PACKAGE_ID,
				},
			}),
		);
		const json4 = JSON.parse(await tx4.toJSON());
		expect(json4.inputs).toEqual([{ UnresolvedObject: { objectId: OVERRIDE_ID } }]);
	});

	it('omitting both the argument and the config value fails with a descriptive error', async () => {
		await generate();

		const mod = await import(join(GENERATED_DIR, 'testpkg', 'registry.js'));
		const tx = new Transaction();

		expect(() => tx.add(mod.lookup({}))).toThrowError(
			'Missing config value for "registryObj": pass it explicitly in arguments, or include it in the config object',
		);
	});

	it('resolvers receive the normalized matched parameter instantiation and call-site metadata', async () => {
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

		expect(contexts).toEqual([
			{
				typeArguments: [
					'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
				],
				packageAddress: PACKAGE_ID,
				moduleName: 'registry',
				functionName: 'container_size',
				parameterName: 'container',
			},
		]);
		expect(json.inputs).toEqual([{ UnresolvedObject: { objectId: CONTAINER_ID } }]);
	});
});
