// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { bcs } from '@mysten/sui/bcs';
import { ModuleRegistry } from '../src/module-registry.js';
import { MoveModuleBuilder } from '../src/move-module-builder.js';
import { getUtilsContent } from '../src/generate-utils.js';

// End-to-end coverage: render real codegen output for phantom/generic types and
// call typeTag/resolveTypeTag on the actual generated exports. The synthetic
// tests in type-tag.test.ts hand-construct MoveStruct instances; this test wires
// codegen emission and the typeTag runtime together so the seam between them is
// exercised, including phantom-only consts, mixed phantom/non-phantom factories,
// and phantom-first index remapping.

const E2E_DIR = join(__dirname, '__typetag_codegen');
const SUMMARIES_DIR = join(__dirname, 'move/testpkg/package_summaries');

const ADDRESS_MAPPINGS = {
	std: '0x0000000000000000000000000000000000000000000000000000000000000001',
	sui: '0x0000000000000000000000000000000000000000000000000000000000000002',
	testpkg: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

let counter: any;
let registry: any;

beforeAll(async () => {
	await mkdir(join(E2E_DIR, 'utils'), { recursive: true });
	await writeFile(join(E2E_DIR, 'utils', 'index.ts'), getUtilsContent());

	const moduleRegistry = new ModuleRegistry(ADDRESS_MAPPINGS);

	const counterBuilder = await MoveModuleBuilder.fromSummaryFile(
		join(SUMMARIES_DIR, 'testpkg', 'counter.json'),
		moduleRegistry,
		'@test/testpkg',
		'.js',
		false,
	);
	counterBuilder.includeTypes(['Wrapper', 'Pair', 'PhantomFirst']);
	await counterBuilder.renderBCSTypes();
	await writeFile(join(E2E_DIR, 'counter.ts'), await counterBuilder.toString('./', './counter.ts'));

	const registryBuilder = await MoveModuleBuilder.fromSummaryFile(
		join(SUMMARIES_DIR, 'testpkg', 'registry.json'),
		moduleRegistry,
		'@test/testpkg',
		'.js',
		false,
	);
	registryBuilder.includeTypes(['Container', 'PhantomResult', 'MixedResult']);
	await registryBuilder.renderBCSTypes();
	await writeFile(
		join(E2E_DIR, 'registry.ts'),
		await registryBuilder.toString('./', './registry.ts'),
	);

	counter = await import(/* @vite-ignore */ join(E2E_DIR, 'counter.ts'));
	registry = await import(/* @vite-ignore */ join(E2E_DIR, 'registry.ts'));
});

afterAll(async () => {
	await rm(E2E_DIR, { recursive: true, force: true });
});

describe('typeTag on real codegen output', () => {
	it('builds tags for a phantom-only struct const (Container<phantom T>)', () => {
		// This is the shape of a generic-over-coin object like MultiVestingVault<phantom T>:
		// codegen emits it as a const, and typeTag fills the phantom from typeArguments.
		expect(registry.Container.typeTag({ typeArguments: ['0x2::sui::SUI'] })).toBe(
			'@test/testpkg::registry::Container<0x2::sui::SUI>',
		);
		expect(() => registry.Container.typeTag()).toThrowError(/Missing type arguments/);
	});

	it('builds tags for a phantom-only enum const (PhantomResult<phantom T>)', () => {
		expect(registry.PhantomResult.typeTag({ typeArguments: ['0x2::sui::SUI'] })).toBe(
			'@test/testpkg::registry::PhantomResult<0x2::sui::SUI>',
		);
	});

	it('takes the full positional list for a mixed factory (Pair<T, phantom U>)', () => {
		// Pair is a factory over its non-phantom T; the instance bakes T into the name,
		// and typeTag still takes the full [T, U] list in Move declaration order.
		const pair = counter.Pair(bcs.u64());
		expect(pair.typeTag({ typeArguments: ['u64', '0x2::sui::SUI'] })).toBe(
			'@test/testpkg::counter::Pair<u64, 0x2::sui::SUI>',
		);
		// the instantiated T position is locked to what the factory was called with
		expect(() => pair.typeTag({ typeArguments: ['u32', '0x2::sui::SUI'] })).toThrowError(
			/does not match/,
		);
	});

	it('takes the full positional list for a phantom-first factory (PhantomFirst<phantom A, B>)', () => {
		const pf = counter.PhantomFirst(bcs.u64());
		expect(pf.typeTag({ typeArguments: ['0xa::a::A', 'u64'] })).toBe(
			'@test/testpkg::counter::PhantomFirst<0xa::a::A, u64>',
		);
	});

	it('takes the full positional list for a mixed enum factory (MixedResult<phantom T, V>)', () => {
		const mr = registry.MixedResult(bcs.u64());
		expect(mr.typeTag({ typeArguments: ['0x2::sui::SUI', 'u64'] })).toBe(
			'@test/testpkg::registry::MixedResult<0x2::sui::SUI, u64>',
		);
	});

	it('accepts another generated type as a type argument', () => {
		const inner = registry.Container.typeTag({ typeArguments: ['0x2::sui::SUI'] });
		expect(registry.PhantomResult.typeTag({ typeArguments: [inner] })).toBe(
			'@test/testpkg::registry::PhantomResult<@test/testpkg::registry::Container<0x2::sui::SUI>>',
		);
	});
});

describe('resolveTypeTag on real codegen output', () => {
	// Generated tags use the configured package name (@test/testpkg), an MVR-style
	// name that must be resolved before the tag can be used against on-chain data.
	function mockClient(packages: Record<string, string>) {
		return {
			core: {
				mvr: {
					async resolveType({ type }: { type: string }) {
						let resolved = type;
						for (const [name, address] of Object.entries(packages)) {
							resolved = resolved.replaceAll(name, address);
						}
						return { type: resolved };
					},
				},
			},
		};
	}

	it('resolves the package name and normalizes the result', async () => {
		const client = mockClient({ '@test/testpkg': '0xabc' });
		const resolved = await registry.Container.resolveTypeTag({
			client,
			typeArguments: ['0x2::sui::SUI'],
		});
		expect(resolved).toBe(
			`0x${'0'.repeat(61)}abc::registry::Container<0x${'0'.repeat(63)}2::sui::SUI>`,
		);
	});
});
