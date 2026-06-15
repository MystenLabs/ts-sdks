// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';
import { getUtilsContent } from '../src/generate-utils.js';

// Runtime + compile-time tests for the typeTag/resolveTypeTag methods on the
// generated MoveStruct/MoveEnum/MoveTuple classes. The utils content lives
// inside a template literal in `generate-utils.ts`, so it is written to a
// temp file and imported/typechecked from there.

const UTILS_PATH = join(__dirname, '__typetag_utils.ts');

let utils: any;

beforeAll(async () => {
	await writeFile(UTILS_PATH, getUtilsContent());
	utils = await import(/* @vite-ignore */ UTILS_PATH);
});

afterAll(async () => {
	await rm(UTILS_PATH, { force: true });
});

function makeTypes() {
	const { MoveStruct, MoveEnum } = utils;
	const { bcs } = require('@mysten/sui/bcs');

	const Balance = new MoveStruct({
		name: '0x2::balance::Balance<phantom T>',
		fields: { value: bcs.u64() },
	});

	const StakedWal = new MoveStruct({
		name: '@local-pkg/walrus::staked_wal::StakedWal',
		fields: { id: bcs.Address },
	});

	const Pool = new MoveStruct({
		name: '0xdee9::pool::Pool<phantom Base, phantom Quote>',
		fields: { id: bcs.Address },
	});

	// as codegen emits for `struct Wrapper<phantom A, B, phantom C> { value: B }`
	const Wrapper = new MoveStruct({
		name: '0xabc::wrapper::Wrapper<phantom A, u64, phantom C>',
		fields: { value: bcs.u64() },
	});

	const MapOfBalances = new MoveStruct({
		name: '0x2::vec_map::VecMap<u8, 0x2::balance::Balance<phantom T>>',
		fields: { key: bcs.u8(), value: Balance },
	});

	const Status = new MoveEnum({
		name: '0xabc::status::Status<phantom T>',
		fields: { Active: null, Inactive: null },
	});

	return { Balance, StakedWal, Pool, Wrapper, MapOfBalances, Status, bcs };
}

describe('typeTag (runtime)', () => {
	it('returns the name verbatim for non-generic types', () => {
		const { StakedWal } = makeTypes();
		expect(StakedWal.typeTag()).toBe('@local-pkg/walrus::staked_wal::StakedWal');
	});

	it('fills phantom holes positionally', () => {
		const { Balance, Pool } = makeTypes();
		expect(Balance.typeTag({ typeArguments: ['0x2::sui::SUI'] })).toBe(
			'0x2::balance::Balance<0x2::sui::SUI>',
		);
		expect(Pool.typeTag({ typeArguments: ['0x2::sui::SUI', '0xb::wal::WAL'] })).toBe(
			'0xdee9::pool::Pool<0x2::sui::SUI, 0xb::wal::WAL>',
		);
	});

	it('throws when type arguments are missing', () => {
		const { Balance } = makeTypes();
		expect(() => Balance.typeTag()).toThrowError(/Missing type arguments/);
	});

	it('throws on wrong arity', () => {
		const { Balance } = makeTypes();
		expect(() => Balance.typeTag({ typeArguments: ['a', 'b'] })).toThrowError(
			/Expected 1 type arguments/,
		);
	});

	it('takes the full positional list for mixed phantom and non-phantom params', () => {
		const { Wrapper } = makeTypes();
		expect(Wrapper.typeTag({ typeArguments: ['0xa::a::A', 'u64', '0xc::c::C'] })).toBe(
			'0xabc::wrapper::Wrapper<0xa::a::A, u64, 0xc::c::C>',
		);
	});

	it('uses supplied type arguments verbatim', () => {
		// type arguments are not verified against the type the instance was created
		// with; whatever the caller passes is used to build the tag
		const { MapOfBalances } = makeTypes();
		const padded = `0x${'0'.repeat(63)}2`;
		expect(
			MapOfBalances.typeTag({
				typeArguments: ['u8', `${padded}::balance::Balance<0x2::sui::SUI>`],
			}),
		).toBe(`0x2::vec_map::VecMap<u8, ${padded}::balance::Balance<0x2::sui::SUI>>`);
		expect(
			MapOfBalances.typeTag({
				typeArguments: ['u8', '@mysten/framework::balance::Balance<0x2::sui::SUI>'],
			}),
		).toBe('0x2::vec_map::VecMap<u8, @mysten/framework::balance::Balance<0x2::sui::SUI>>');
	});

	it('requires type arguments when the name has phantom holes', () => {
		const { MapOfBalances } = makeTypes();
		expect(
			MapOfBalances.typeTag({
				typeArguments: ['u8', '0x2::balance::Balance<0x2::sui::SUI>'],
			}),
		).toBe('0x2::vec_map::VecMap<u8, 0x2::balance::Balance<0x2::sui::SUI>>');
		expect(() => MapOfBalances.typeTag()).toThrowError(/Missing type arguments/);
	});

	it('rejects type arguments that smuggle unfilled phantom holes', () => {
		const { Balance } = makeTypes();
		expect(() =>
			Balance.typeTag({ typeArguments: ['0x2::balance::Balance<phantom T>'] }),
		).toThrowError(/unfilled phantom parameter/);
	});

	it('supports the package override', () => {
		const { StakedWal, Balance } = makeTypes();
		expect(StakedWal.typeTag({ package: '0x9f9' })).toBe('0x9f9::staked_wal::StakedWal');
		expect(Balance.typeTag({ package: '0x9f9', typeArguments: ['0x2::sui::SUI'] })).toBe(
			'0x9f9::balance::Balance<0x2::sui::SUI>',
		);
	});

	it('accepts BCS types as type arguments via their names', () => {
		const { Balance, bcs } = makeTypes();
		expect(Balance.typeTag({ typeArguments: [bcs.vector(bcs.u8())] })).toBe(
			'0x2::balance::Balance<vector<u8>>',
		);
	});

	it('composes through nested typeTag calls', () => {
		const { Balance, MapOfBalances } = makeTypes();
		expect(
			MapOfBalances.typeTag({
				typeArguments: ['u8', Balance.typeTag({ typeArguments: ['0x2::sui::SUI'] })],
			}),
		).toBe('0x2::vec_map::VecMap<u8, 0x2::balance::Balance<0x2::sui::SUI>>');
	});

	it('rejects values that are not strings or BCS types', () => {
		const { Balance } = makeTypes();
		// functions have a .name property but are not valid type arguments
		expect(() => Balance.typeTag({ typeArguments: [(() => {}) as never] })).toThrowError(
			/Invalid type argument/,
		);
	});

	it('rejects BCS types whose names are not Move types', () => {
		const { Balance, bcs } = makeTypes();
		// bcs.string() has name 'string', which is not a Move type tag
		expect(() => Balance.typeTag({ typeArguments: [bcs.string()] })).toThrowError();
	});

	it('rejects enum variant inner structs and other non-Move names', () => {
		const { MoveStruct } = utils;
		const { bcs } = makeTypes();
		const Variant = new MoveStruct({
			name: 'StakedWalState.Withdrawing',
			fields: { epoch: bcs.u32() },
		});
		expect(() => Variant.typeTag()).toThrowError(/not a top-level Move type/);
	});

	it('works on MoveEnum', () => {
		const { Status } = makeTypes();
		expect(Status.typeTag({ typeArguments: ['0x2::sui::SUI'] })).toBe(
			'0xabc::status::Status<0x2::sui::SUI>',
		);
	});
});

describe('instantiated types (runtime)', () => {
	it('builds tags for a fully instantiated type with or without restated args', () => {
		const { MoveStruct } = utils;
		const { bcs } = makeTypes();
		// as a generated factory bakes: VecMap(bcs.u8(), bcs.u64())
		const PlainMap = new MoveStruct({
			name: '0x2::vec_map::VecMap<u8, u64>',
			fields: { key: bcs.u8(), value: bcs.u64() },
		});
		expect(PlainMap.typeTag()).toBe('0x2::vec_map::VecMap<u8, u64>');
		expect(PlainMap.typeTag({ typeArguments: ['u8', 'u64'] })).toBe(
			'0x2::vec_map::VecMap<u8, u64>',
		);
	});
});

describe('resolveTypeTag (runtime)', () => {
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

	it('resolves MVR names and normalizes the result', async () => {
		const { StakedWal } = makeTypes();
		const client = mockClient({ '@local-pkg/walrus': '0x9f9' });
		expect(await StakedWal.resolveTypeTag({ client })).toBe(
			`0x${'0'.repeat(61)}9f9::staked_wal::StakedWal`,
		);
	});

	it('normalizes address-only tags without resolution', async () => {
		const { Balance } = makeTypes();
		const client = mockClient({});
		expect(await Balance.resolveTypeTag({ client, typeArguments: ['0x2::sui::SUI'] })).toBe(
			`0x${'0'.repeat(63)}2::balance::Balance<0x${'0'.repeat(63)}2::sui::SUI>`,
		);
	});
});

describe('typeTag (compile time)', () => {
	it(
		'enforces arity, positions, and hole-freedom at the type level',
		{ timeout: 60_000 },
		async () => {
			const fixturePath = join(__dirname, '__typetag_typecheck.ts');
			await writeFile(fixturePath, TYPE_FIXTURE);

			try {
				const program = ts.createProgram({
					rootNames: [fixturePath],
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
					.filter((d) => d.file?.fileName === fixturePath);

				const messages = diagnostics.map((d) => {
					const text = ts.flattenDiagnosticMessageText(d.messageText, '\n');
					if (d.file && d.start !== undefined) {
						const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
						return `[fixture:${line + 1}:${character + 1}] ${text}`;
					}
					return text;
				});

				expect(messages, `typeTag fixture has type errors:\n${messages.join('\n')}`).toEqual([]);
			} finally {
				await rm(fixturePath, { force: true });
			}
		},
	);
});

const TYPE_FIXTURE = /* ts */ `
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { MoveStruct } from './__typetag_utils.js';

type Expect<T extends true> = T;
type Equal<A, B> = (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2
	? true
	: false;

const Balance = new MoveStruct({
	name: '0x2::balance::Balance<phantom T>',
	fields: { value: bcs.u64() },
});

const StakedWal = new MoveStruct({
	name: '@local-pkg/walrus::staked_wal::StakedWal',
	fields: { id: bcs.Address },
});

function VecMap<K extends BcsType<any>, V extends BcsType<any>>(...typeParameters: [K, V]) {
	return new MoveStruct({
		name: \`0x2::vec_map::VecMap<\${typeParameters[0].name as K['name']}, \${typeParameters[1].name as V['name']}>\` as const,
		fields: { key: typeParameters[0], value: typeParameters[1] },
	});
}

// non-generic types: options are optional
const t1 = StakedWal.typeTag();
const t2 = StakedWal.typeTag({ package: '0x9f9' });
type _1 = Expect<Equal<typeof t1, string>> | Expect<Equal<typeof t2, string>>;

// phantom parameters anywhere in the name make typeArguments required
// @ts-expect-error — Balance requires type arguments
Balance.typeTag();
// @ts-expect-error — options without typeArguments are not enough
Balance.typeTag({ package: '0x9f9' });
const t3 = Balance.typeTag({ typeArguments: ['0x2::sui::SUI'] });
type _3 = Expect<Equal<typeof t3, string>>;

// ...including holes nested inside instantiated factory arguments
const MapOfBalances = VecMap(bcs.u8(), Balance);
// @ts-expect-error — the nested phantom hole requires type arguments
MapOfBalances.typeTag();
MapOfBalances.typeTag({ typeArguments: ['u8', '0x2::balance::Balance<0x2::sui::SUI>'] });

// fully instantiated factory results are zero-arg
VecMap(bcs.u8(), bcs.u64()).typeTag();

// only strings and BCS types are valid arguments — objects that merely have a
// .name property (like every function) are rejected
// @ts-expect-error — functions are not type arguments
Balance.typeTag({ typeArguments: [() => {}] });
// @ts-expect-error — arbitrary named objects are not type arguments
Balance.typeTag({ typeArguments: [{ name: '0x2::sui::SUI' }] });
Balance.typeTag({ typeArguments: [bcs.vector(bcs.u8())] }); // BCS types are accepted

// resolveTypeTag always requires options (client), and typeArguments when phantom
declare const client: import('@mysten/sui/client').ClientWithCoreApi;
// @ts-expect-error — client is required
StakedWal.resolveTypeTag();
void StakedWal.resolveTypeTag({ client });
// @ts-expect-error — Balance requires type arguments
void Balance.resolveTypeTag({ client });
void Balance.resolveTypeTag({ client, typeArguments: ['0x2::sui::SUI'] });

// widened names degrade gracefully: everything optional
const Dynamic: MoveStruct<{ value: ReturnType<typeof bcs.u64> }, string> = Balance;
Dynamic.typeTag();
Dynamic.typeTag({ typeArguments: ['a', 'b', 'c'] });

console.log(t1, t2, t3);
`;
