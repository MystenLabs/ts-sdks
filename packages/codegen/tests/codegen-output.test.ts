// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { MoveModuleBuilder } from '../src/move-module-builder.js';

const SUMMARIES_DIR = join(__dirname, 'move/testpkg/package_summaries');

const ADDRESS_MAPPINGS = {
	std: '0x0000000000000000000000000000000000000000000000000000000000000001',
	sui: '0x0000000000000000000000000000000000000000000000000000000000000002',
	testpkg: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

async function createBuilder(module: 'counter' | 'registry', includePhantomTypeParameters = false) {
	return MoveModuleBuilder.fromSummaryFile(
		join(SUMMARIES_DIR, 'testpkg', `${module}.json`),
		ADDRESS_MAPPINGS,
		'@test/testpkg',
		'.js',
		includePhantomTypeParameters,
	);
}

async function createBuilders(includePhantomTypeParameters = false) {
	const counter = await createBuilder('counter', includePhantomTypeParameters);
	const registry = await createBuilder('registry', includePhantomTypeParameters);
	return {
		counter,
		registry,
		all: {
			'testpkg::counter': counter,
			'testpkg::registry': registry,
		},
	};
}

/** Render a builder to string (types only, functions only, or both) */
async function render(
	builder: MoveModuleBuilder,
	options: { types?: boolean; functions?: boolean } = { types: true, functions: true },
) {
	if (options.types) await builder.renderBCSTypes();
	if (options.functions) await builder.renderFunctions();
	return builder.toString('./', './testpkg/test.ts');
}

/** Extract just the body (everything after imports) from rendered output */
function extractBody(output: string): string {
	const lines = output.split('\n');
	// Find the first non-import, non-comment, non-empty line after header
	let bodyStart = 0;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].startsWith('const $moduleName')) {
			bodyStart = i;
			break;
		}
	}
	return lines.slice(bodyStart).join('\n').trim();
}

describe('struct codegen output', () => {
	it('simple struct with key ability (Counter)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all, ['Counter']);
		const output = await render(counter, { types: true, functions: false });

		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::counter';
			export const Counter = new MoveStruct({ name: \`\${$moduleName}::Counter\`, fields: {
			        id: bcs.Address,
			        value: bcs.u64(),
			        owner: bcs.Address
			    } });"
		`);
	});

	it('struct with key+store abilities (AdminCap)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all, ['AdminCap']);
		const output = await render(counter, { types: true, functions: false });

		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::counter';
			export const AdminCap = new MoveStruct({ name: \`\${$moduleName}::AdminCap\`, fields: {
			        id: bcs.Address
			    } });"
		`);
	});

	it('struct with copy+drop abilities (CounterCreated)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all, ['CounterCreated']);
		const output = await render(counter, { types: true, functions: false });

		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::counter';
			export const CounterCreated = new MoveStruct({ name: \`\${$moduleName}::CounterCreated\`, fields: {
			        counter_id: bcs.Address,
			        initial_value: bcs.u64()
			    } });"
		`);
	});

	it('struct with all primitive types (Primitives)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all, ['Primitives']);
		const output = await render(counter, { types: true, functions: false });

		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::counter';
			export const Primitives = new MoveStruct({ name: \`\${$moduleName}::Primitives\`, fields: {
			        val_bool: bcs.bool(),
			        val_u8: bcs.u8(),
			        val_u16: bcs.u16(),
			        val_u32: bcs.u32(),
			        val_u64: bcs.u64(),
			        val_u128: bcs.u128(),
			        val_u256: bcs.u256(),
			        val_address: bcs.Address
			    } });"
		`);
	});

	it('struct with composite types (Composites)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all, ['Composites']);
		const output = await render(counter, { types: true, functions: false });

		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::counter';
			export const Composites = new MoveStruct({ name: \`\${$moduleName}::Composites\`, fields: {
			        val_string: bcs.string(),
			        val_ascii_string: bcs.string(),
			        val_id: bcs.Address,
			        val_vector_u8: bcs.vector(bcs.u8()),
			        val_vector_u64: bcs.vector(bcs.u64()),
			        val_vector_bool: bcs.vector(bcs.bool()),
			        val_vector_address: bcs.vector(bcs.Address),
			        val_vector_string: bcs.vector(bcs.string()),
			        val_nested_vector: bcs.vector(bcs.vector(bcs.u8())),
			        val_option_u64: bcs.option(bcs.u64()),
			        val_option_string: bcs.option(bcs.string()),
			        val_option_id: bcs.option(bcs.Address),
			        val_option_bool: bcs.option(bcs.bool()),
			        val_vector_option: bcs.vector(bcs.option(bcs.u64()))
			    } });"
		`);
	});

	it('generic struct with non-phantom type parameter (Wrapper<T>)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all, ['Wrapper']);
		const output = await render(counter, { types: true, functions: false });

		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::counter';
			/** Generic struct with a non-phantom type parameter. */
			export function Wrapper<T extends BcsType<any>>(...typeParameters: [
			    T
			]) {
			    return new MoveStruct({ name: \`\${$moduleName}::Wrapper<\${typeParameters[0].name as T['name']}>\`, fields: {
			            id: bcs.Address,
			            value: typeParameters[0]
			        } });
			}"
		`);
	});

	it('generic struct with phantom + non-phantom type parameters (Pair<T, U>)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all, ['Pair']);
		const output = await render(counter, { types: true, functions: false });

		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::counter';
			/** Generic struct with multiple type parameters, mixing phantom and non-phantom. */
			export function Pair<T extends BcsType<any>>(...typeParameters: [
			    T
			]) {
			    return new MoveStruct({ name: \`\${$moduleName}::Pair<\${typeParameters[0].name as T['name']}, phantom U>\`, fields: {
			            id: bcs.Address,
			            first: typeParameters[0]
			        } });
			}"
		`);
	});

	it('phantom type index remapping (PhantomFirst<phantom A, B>)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all, ['PhantomFirst']);
		const output = await render(counter, { types: true, functions: false });

		// B is at original index 1 but should use typeParameters[0] after filtering phantom A
		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::counter';
			/**
			 * Tests phantom type parameter index remapping when phantom comes first. B is at
			 * original index 1 but should use typeParameters[0] after filtering.
			 */
			export function PhantomFirst<B extends BcsType<any>>(...typeParameters: [
			    B
			]) {
			    return new MoveStruct({ name: \`\${$moduleName}::PhantomFirst<phantom A, \${typeParameters[0].name as B['name']}>\`, fields: {
			            id: bcs.Address,
			            value: typeParameters[0]
			        } });
			}"
		`);
	});

	it('struct with enum and vector fields (Entry)', async () => {
		const { registry, all } = await createBuilders();
		registry.includeTypes(all, ['Entry']);
		const output = await render(registry, { types: true, functions: false });

		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::registry';
			/** Status enum with unit, named-field, and mixed variants. */
			export const Status = new MoveEnum({ name: \`\${$moduleName}::Status\`, fields: {
			        Active: null,
			        Inactive: null,
			        Pending: new MoveStruct({ name: \`Status.Pending\`, fields: {
			                reason: bcs.string()
			            } })
			    } });
			export const Entry = new MoveStruct({ name: \`\${$moduleName}::Entry\`, fields: {
			        name: bcs.string(),
			        owner: bcs.Address,
			        status: Status,
			        tags: bcs.vector(bcs.string())
			    } });"
		`);
	});

	it('struct with phantom generic (Container<phantom T>)', async () => {
		const { registry, all } = await createBuilders();
		registry.includeTypes(all, ['Container']);
		const output = await render(registry, { types: true, functions: false });

		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::registry';
			export const Container = new MoveStruct({ name: \`\${$moduleName}::Container<phantom T>\`, fields: {
			        id: bcs.Address,
			        size: bcs.u64()
			    } });"
		`);
	});
});

describe('enum codegen output', () => {
	it('enum with unit and named-field variants (Status)', async () => {
		const { registry, all } = await createBuilders();
		registry.includeTypes(all, ['Status']);
		const output = await render(registry, { types: true, functions: false });

		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::registry';
			/** Status enum with unit, named-field, and mixed variants. */
			export const Status = new MoveEnum({ name: \`\${$moduleName}::Status\`, fields: {
			        Active: null,
			        Inactive: null,
			        Pending: new MoveStruct({ name: \`Status.Pending\`, fields: {
			                reason: bcs.string()
			            } })
			    } });"
		`);
	});

	it('generic enum (Result<T>)', async () => {
		const { registry, all } = await createBuilders();
		registry.includeTypes(all, ['Result']);
		const output = await render(registry, { types: true, functions: false });

		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::registry';
			/** Generic enum. */
			export function Result<T extends BcsType<any>>(...typeParameters: [
			    T
			]) {
			    return new MoveEnum({ name: \`\${$moduleName}::Result<\${typeParameters[0].name as T['name']}>\`, fields: {
			            Ok: new MoveStruct({ name: \`Result.Ok\`, fields: {
			                    value: typeParameters[0]
			                } }),
			            Err: new MoveStruct({ name: \`Result.Err\`, fields: {
			                    code: bcs.u64(),
			                    message: bcs.string()
			                } })
			        } });
			}"
		`);
	});

	it('enum with all phantom type parameters becomes const (PhantomResult<phantom T>)', async () => {
		const { registry, all } = await createBuilders();
		registry.includeTypes(all, ['PhantomResult']);
		const output = await render(registry, { types: true, functions: false });

		// All type params are phantom, so it becomes a const (not a function)
		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::registry';
			/** Enum with phantom type parameter (becomes a const, not a function). */
			export const PhantomResult = new MoveEnum({ name: \`\${$moduleName}::PhantomResult<phantom T>\`, fields: {
			        Success: null,
			        Failure: new MoveStruct({ name: \`PhantomResult.Failure\`, fields: {
			                code: bcs.u64()
			            } })
			    } });"
		`);
	});

	it('enum phantom type index remapping (MixedResult<phantom T, V>)', async () => {
		const { registry, all } = await createBuilders();
		registry.includeTypes(all, ['MixedResult']);
		const output = await render(registry, { types: true, functions: false });

		// V is at original index 1 but should use typeParameters[0] after filtering phantom T
		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::registry';
			/** Enum with phantom first, non-phantom second (tests index remapping). */
			export function MixedResult<V extends BcsType<any>>(...typeParameters: [
			    V
			]) {
			    return new MoveEnum({ name: \`\${$moduleName}::MixedResult<phantom T, \${typeParameters[0].name as V['name']}>\`, fields: {
			            Ok: new MoveStruct({ name: \`MixedResult.Ok\`, fields: {
			                    value: typeParameters[0]
			                } }),
			            Err: new MoveStruct({ name: \`MixedResult.Err\`, fields: {
			                    code: bcs.u64()
			                } })
			        } });
			}"
		`);
	});
});

describe('function codegen output', () => {
	it('public entry function (create)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all);
		counter.includeFunctions(['create']);
		const output = await render(counter);
		const fnMatch = output.match(/export interface CreateOptions[\s\S]*?^}/m);

		expect(fnMatch?.[0]).toMatchInlineSnapshot(`
			"export interface CreateOptions {
			    package?: string;
			    arguments?: [
			    ];
			}"
		`);

		const fnBody = output.match(/export function create[\s\S]*?^}/m);
		expect(fnBody?.[0]).toMatchInlineSnapshot(`
			"export function create(options: CreateOptions = {}) {
			    const packageAddress = options.package ?? '@test/testpkg';
			    return (tx: Transaction) => tx.moveCall({
			        package: packageAddress,
			        module: 'counter',
			        function: 'create',
			    });
			}"
		`);
	});

	it('public function with &mut ref and return (increment)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all);
		counter.includeFunctions(['increment']);
		const output = await render(counter);

		const argInterface = output.match(/export interface IncrementArguments[\s\S]*?^}/m);
		expect(argInterface?.[0]).toMatchInlineSnapshot(`
			"export interface IncrementArguments {
			    counter: RawTransactionArgument<string>;
			}"
		`);

		const fnBody = output.match(/export function increment[\s\S]*?^}/m);
		expect(fnBody?.[0]).toMatchInlineSnapshot(`
			"export function increment(options: IncrementOptions) {
			    const packageAddress = options.package ?? '@test/testpkg';
			    const argumentsTypes = [
			        null
			    ] satisfies (string | null)[];
			    const parameterNames = ["counter"];
			    return (tx: Transaction) => tx.moveCall({
			        package: packageAddress,
			        module: 'counter',
			        function: 'increment',
			        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			    });
			}"
		`);
	});

	it('public function with immutable ref (value)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all);
		counter.includeFunctions(['value']);
		const output = await render(counter);

		const argInterface = output.match(/export interface ValueArguments[\s\S]*?^}/m);
		expect(argInterface?.[0]).toMatchInlineSnapshot(`
			"export interface ValueArguments {
			    counter: RawTransactionArgument<string>;
			}"
		`);
	});

	it('function with Option parameter (set_optional)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all);
		counter.includeFunctions(['set_optional']);
		const output = await render(counter);

		const argInterface = output.match(/export interface SetOptionalArguments[\s\S]*?^}/m);
		expect(argInterface?.[0]).toMatchInlineSnapshot(`
			"export interface SetOptionalArguments {
			    counter: RawTransactionArgument<string>;
			    newValue: RawTransactionArgument<number | bigint | null>;
			}"
		`);
	});

	it('function with vector parameter (batch_set)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all);
		counter.includeFunctions(['batch_set']);
		const output = await render(counter);

		const argInterface = output.match(/export interface BatchSetArguments[\s\S]*?^}/m);
		expect(argInterface?.[0]).toMatchInlineSnapshot(`
			"export interface BatchSetArguments {
			    counter: RawTransactionArgument<string>;
			    values: RawTransactionArgument<number | bigint[]>;
			}"
		`);
	});

	it('generic function (wrap<T>)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all);
		counter.includeFunctions(['wrap']);
		const output = await render(counter);

		const optionsInterface = output.match(/export interface WrapOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).toMatchInlineSnapshot(`
			"export interface WrapOptions<T extends BcsType<any>> {
			    package?: string;
			    arguments: WrapArguments<T> | [
			        value: RawTransactionArgument<T>
			    ];
			    typeArguments: [
			        string
			    ];
			}"
		`);
	});

	it('multi-generic function (create_pair<T, U>)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all);
		counter.includeFunctions(['create_pair']);
		const output = await render(counter);

		const optionsInterface = output.match(/export interface CreatePairOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).toMatchInlineSnapshot(`
			"export interface CreatePairOptions<T extends BcsType<any>> {
			    package?: string;
			    arguments: CreatePairArguments<T> | [
			        first: RawTransactionArgument<T>
			    ];
			    typeArguments: [
			        string,
			        string
			    ];
			}"
		`);
	});

	it('function with multiple return values (get_value_and_owner)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all);
		counter.includeFunctions(['get_value_and_owner']);
		const output = await render(counter);

		const fnBody = output.match(/export function getValueAndOwner[\s\S]*?^}/m);
		expect(fnBody?.[0]).toMatchInlineSnapshot(`
			"export function getValueAndOwner(options: GetValueAndOwnerOptions) {
			    const packageAddress = options.package ?? '@test/testpkg';
			    const argumentsTypes = [
			        null
			    ] satisfies (string | null)[];
			    const parameterNames = ["counter"];
			    return (tx: Transaction) => tx.moveCall({
			        package: packageAddress,
			        module: 'counter',
			        function: 'get_value_and_owner',
			        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			    });
			}"
		`);
	});

	it('private entry function (reset)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all);
		counter.includeFunctions(['reset']);
		const output = await render(counter);

		const fnBody = output.match(/export function reset[\s\S]*?^}/m);
		expect(fnBody?.[0]).toMatchInlineSnapshot(`
			"export function reset(options: ResetOptions) {
			    const packageAddress = options.package ?? '@test/testpkg';
			    const argumentsTypes = [
			        null
			    ] satisfies (string | null)[];
			    const parameterNames = ["counter"];
			    return (tx: Transaction) => tx.moveCall({
			        package: packageAddress,
			        module: 'counter',
			        function: 'reset',
			        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			    });
			}"
		`);
	});

	it('function with well-known Clock parameter (value_with_clock)', async () => {
		const { counter, all } = await createBuilders();
		counter.includeTypes(all);
		counter.includeFunctions(['value_with_clock']);
		const output = await render(counter);

		const argInterface = output.match(/export interface ValueWithClockArguments[\s\S]*?^}/m);
		expect(argInterface?.[0]).toMatchInlineSnapshot(`
			"export interface ValueWithClockArguments {
			    counter: RawTransactionArgument<string>;
			}"
		`);

		// Clock should be auto-injected, not in the arguments interface
		const fnBody = output.match(/export function valueWithClock[\s\S]*?^}/m);
		expect(fnBody?.[0]).toContain("'0x2::clock::Clock'");
	});

	it('function with enum parameter (is_active)', async () => {
		const { registry, all } = await createBuilders();
		registry.includeTypes(all);
		registry.includeFunctions(['is_active']);
		const output = await render(registry);

		const argInterface = output.match(/export interface IsActiveArguments[\s\S]*?^}/m);
		expect(argInterface?.[0]).toMatchInlineSnapshot(`
			"export interface IsActiveArguments {
			    status: RawTransactionArgument<string>;
			}"
		`);
	});

	it('function returning generic enum (ok_result)', async () => {
		const { registry, all } = await createBuilders();
		registry.includeTypes(all);
		registry.includeFunctions(['ok_result']);
		const output = await render(registry);

		const optionsInterface = output.match(/export interface OkResultOptions[\s\S]*?^}/m);
		expect(optionsInterface?.[0]).toMatchInlineSnapshot(`
			"export interface OkResultOptions<T extends BcsType<any>> {
			    package?: string;
			    arguments: OkResultArguments<T> | [
			        value: RawTransactionArgument<T>
			    ];
			    typeArguments: [
			        string
			    ];
			}"
		`);
	});
});

describe('includePhantomTypeParameters option', () => {
	it('includes phantom type parameters when enabled (Pair<T, U>)', async () => {
		const { counter, all } = await createBuilders(true);
		counter.includeTypes(all, ['Pair']);
		const output = await render(counter, { types: true, functions: false });

		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::counter';
			/** Generic struct with multiple type parameters, mixing phantom and non-phantom. */
			export function Pair<T extends BcsType<any>, U extends BcsType<any>>(...typeParameters: [
			    T,
			    U
			]) {
			    return new MoveStruct({ name: \`\${$moduleName}::Pair<\${typeParameters[0].name as T['name']}, \${typeParameters[1].name as U['name']}>\`, fields: {
			            id: bcs.Address,
			            first: typeParameters[0]
			        } });
			}"
		`);
	});

	it('includes phantom type parameters when enabled (Container<T>)', async () => {
		const { registry, all } = await createBuilders(true);
		registry.includeTypes(all, ['Container']);
		const output = await render(registry, { types: true, functions: false });

		expect(extractBody(output)).toMatchInlineSnapshot(`
			"const $moduleName = '@test/testpkg::registry';
			/** A generic container with a phantom type parameter. */
			export function Container<T extends BcsType<any>>(...typeParameters: [
			    T
			]) {
			    return new MoveStruct({ name: \`\${$moduleName}::Container<\${typeParameters[0].name as T['name']}>\`, fields: {
			            id: bcs.Address,
			            size: bcs.u64()
			        } });
			}"
		`);
	});
});
