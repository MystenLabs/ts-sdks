// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';
import { getUtilsContent } from '../src/generate-utils.js';

// Runtime + compile-time tests for the typeTag/resolveTypeTag/withTypeArguments
// methods on the generated MoveStruct/MoveEnum/MoveTuple classes. The utils
// content lives inside a template literal in `generate-utils.ts`, so it is
// written to a temp file and imported/typechecked from there.

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

	it('keeps mixed phantom and non-phantom params positional', () => {
		const { Wrapper } = makeTypes();
		expect(Wrapper.typeTag({ typeArguments: ['0xa::a::A', 'u64', '0xc::c::C'] })).toBe(
			'0xabc::wrapper::Wrapper<0xa::a::A, u64, 0xc::c::C>',
		);
		// instantiated positions cannot be overwritten
		expect(() =>
			Wrapper.typeTag({ typeArguments: ['0xa::a::A', 'u32', '0xc::c::C'] }),
		).toThrowError(/does not match u64/);
	});

	it('requires nested phantom holes to be filled', () => {
		const { MapOfBalances } = makeTypes();
		expect(
			MapOfBalances.typeTag({
				typeArguments: ['u8', '0x2::balance::Balance<0x2::sui::SUI>'],
			}),
		).toBe('0x2::vec_map::VecMap<u8, 0x2::balance::Balance<0x2::sui::SUI>>');
		expect(() => MapOfBalances.typeTag()).toThrowError(/Missing type arguments/);
		expect(() => MapOfBalances.typeTag({ typeArguments: ['u8', 'u64'] })).toThrowError(
			/does not match/,
		);
	});

	it('rejects type arguments that smuggle unfilled phantom holes', () => {
		const { Balance } = makeTypes();
		expect(() =>
			Balance.typeTag({ typeArguments: ['0x2::balance::Balance<phantom T>'] }),
		).toThrowError(/unfilled phantom parameter/);
	});

	it('treats package identifiers as substitutable', () => {
		const { MapOfBalances, StakedWal, Wrapper } = makeTypes();
		const padded = `0x${'0'.repeat(63)}2`;
		// normalized for short
		expect(
			MapOfBalances.typeTag({
				typeArguments: ['u8', `${padded}::balance::Balance<0x2::sui::SUI>`],
			}),
		).toBe(`0x2::vec_map::VecMap<u8, ${padded}::balance::Balance<0x2::sui::SUI>>`);
		// MVR name for address
		expect(
			MapOfBalances.typeTag({
				typeArguments: ['u8', '@mysten/framework::balance::Balance<0x2::sui::SUI>'],
			}),
		).toBe('0x2::vec_map::VecMap<u8, @mysten/framework::balance::Balance<0x2::sui::SUI>>');
		// but module::name structure stays anchored
		expect(() =>
			MapOfBalances.typeTag({
				typeArguments: ['u8', '0x2::coin::Coin<0x2::sui::SUI>'],
			}),
		).toThrowError(/does not match/);
		// address in place of a baked MVR name
		expect(StakedWal.typeTag({ package: '0x9f9' })).toBe('0x9f9::staked_wal::StakedWal');
		// instantiated non-package parts stay locked even with a substituted package
		expect(() =>
			Wrapper.typeTag({ typeArguments: ['0xa::a::A', `${padded}::other::Type`, '0xc::c::C'] }),
		).toThrowError(/does not match/);
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

describe('withTypeArguments (runtime)', () => {
	it('creates a working instance with a concrete name', () => {
		const { Balance } = makeTypes();
		const SuiBalance = Balance.withTypeArguments(['0x2::sui::SUI']);
		expect(SuiBalance.name).toBe('0x2::balance::Balance<0x2::sui::SUI>');
		expect(SuiBalance.typeTag()).toBe('0x2::balance::Balance<0x2::sui::SUI>');
		// still a working BCS type
		expect(SuiBalance.parse(SuiBalance.serialize({ value: 100n }).toBytes())).toEqual({
			value: '100',
		});
	});

	it('locks filled phantoms', () => {
		const { Balance } = makeTypes();
		const SuiBalance = Balance.withTypeArguments(['0x2::sui::SUI']);
		expect(() => SuiBalance.typeTag({ typeArguments: ['0xb::wal::WAL'] })).toThrowError(
			/does not match/,
		);
	});

	it('supports partial application by restating holes', () => {
		const { Pool } = makeTypes();
		const BasePool = Pool.withTypeArguments(['0x2::sui::SUI', 'phantom Quote']);
		expect(BasePool.name).toBe('0xdee9::pool::Pool<0x2::sui::SUI, phantom Quote>');
		expect(() => BasePool.typeTag()).toThrowError(/Missing type arguments/);
		expect(BasePool.typeTag({ typeArguments: ['0x2::sui::SUI', '0xb::wal::WAL'] })).toBe(
			'0xdee9::pool::Pool<0x2::sui::SUI, 0xb::wal::WAL>',
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

const Pool = new MoveStruct({
	name: '0xdee9::pool::Pool<phantom Base, phantom Quote>',
	fields: { id: bcs.Address },
});

function Wrapper<B extends BcsType<any>>(...typeParameters: [B]) {
	return new MoveStruct({
		name: \`0xabc::wrapper::Wrapper<phantom A, \${typeParameters[0].name as B['name']}, phantom C>\` as const,
		fields: { value: typeParameters[0] },
	});
}

function VecMap<K extends BcsType<any>, V extends BcsType<any>>(...typeParameters: [K, V]) {
	return new MoveStruct({
		name: \`0x2::vec_map::VecMap<\${typeParameters[0].name as K['name']}, \${typeParameters[1].name as V['name']}>\` as const,
		fields: { key: typeParameters[0], value: typeParameters[1] },
	});
}

// non-generic: zero-arg, literal return; typeArguments rejected
const t1 = StakedWal.typeTag();
type _1 = Expect<Equal<typeof t1, '@local-pkg/walrus::staked_wal::StakedWal'>>;
// @ts-expect-error — StakedWal has no type parameters
StakedWal.typeTag({ typeArguments: ['0x2::sui::SUI'] });

// phantom generic: required, exact literal out
// @ts-expect-error — Balance requires its type argument
Balance.typeTag();
const t2 = Balance.typeTag({ typeArguments: ['0x2::sui::SUI'] });
type _2 = Expect<Equal<typeof t2, '0x2::balance::Balance<0x2::sui::SUI>'>>;
// @ts-expect-error — wrong arity
Balance.typeTag({ typeArguments: ['0x2::sui::SUI', '0x2::sui::SUI'] });

// mixed params stay positional; instantiated positions are locked
const W = Wrapper(bcs.u64());
const t3 = W.typeTag({ typeArguments: ['0xa::a::A', 'u64', '0xc::c::C'] });
type _3 = Expect<Equal<typeof t3, '0xabc::wrapper::Wrapper<0xa::a::A, u64, 0xc::c::C>'>>;
// @ts-expect-error — position 1 is instantiated as u64
W.typeTag({ typeArguments: ['0xa::a::A', 'u32', '0xc::c::C'] });
// @ts-expect-error — all three positions must be supplied
W.typeTag({ typeArguments: ['0xa::a::A'] });

// nested phantom holes are detected and required
const MapOfBalances = VecMap(bcs.u8(), Balance);
// @ts-expect-error — nested hole means zero-arg is rejected
MapOfBalances.typeTag();
const t4 = MapOfBalances.typeTag({
	typeArguments: ['u8', '0x2::balance::Balance<0x2::sui::SUI>'],
});
type _4 = Expect<
	Equal<typeof t4, '0x2::vec_map::VecMap<u8, 0x2::balance::Balance<0x2::sui::SUI>>'>
>;
// @ts-expect-error — 'u64' is not a Balance<...>
MapOfBalances.typeTag({ typeArguments: ['u8', 'u64'] });

// unfilled phantoms cannot be smuggled through type arguments
// @ts-expect-error — Balance still has an unfilled phantom parameter
Balance.typeTag({ typeArguments: [Balance] });
// @ts-expect-error — same as a raw string
Balance.typeTag({ typeArguments: ['0x2::balance::Balance<phantom T>'] });

// withTypeArguments: filled phantoms lock; partial application keeps holes open
const SuiBalance = Balance.withTypeArguments(['0x2::sui::SUI']);
const t5 = SuiBalance.typeTag();
type _5 = Expect<Equal<typeof t5, '0x2::balance::Balance<0x2::sui::SUI>'>>;
const t6 = VecMap(bcs.u8(), SuiBalance).typeTag();
type _6 = Expect<
	Equal<typeof t6, '0x2::vec_map::VecMap<u8, 0x2::balance::Balance<0x2::sui::SUI>>'>
>;
const BasePool = Pool.withTypeArguments(['0x2::sui::SUI', 'phantom Quote']);
// @ts-expect-error — the remaining hole still requires an argument
BasePool.typeTag();
const t7 = BasePool.typeTag({ typeArguments: ['0x2::sui::SUI', '0xb::wal::WAL'] });
type _7 = Expect<Equal<typeof t7, '0xdee9::pool::Pool<0x2::sui::SUI, 0xb::wal::WAL>'>>;
// @ts-expect-error — the filled position is locked
BasePool.typeTag({ typeArguments: ['0xb::wal::WAL', '0xb::wal::WAL'] });

// package identifiers are substitutable (normalized/short/MVR), structure locked
const t8 = MapOfBalances.typeTag({
	typeArguments: [
		'u8',
		'0x0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<0x2::sui::SUI>',
	],
});
type _8 = Expect<
	Equal<
		typeof t8,
		'0x2::vec_map::VecMap<u8, 0x0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<0x2::sui::SUI>>'
	>
>;
const t9 = VecMap(bcs.u8(), StakedWal).typeTag({
	typeArguments: ['u8', '0x9f9::staked_wal::StakedWal'],
});
type _9 = Expect<Equal<typeof t9, '0x2::vec_map::VecMap<u8, 0x9f9::staked_wal::StakedWal>'>>;
// @ts-expect-error — module::name structure is still anchored
MapOfBalances.typeTag({ typeArguments: ['u8', '0x2::coin::Coin<0x2::sui::SUI>'] });

// package override rewrites the package at the type level
const t10 = StakedWal.typeTag({ package: '0x9f9' });
type _10 = Expect<Equal<typeof t10, '0x9f9::staked_wal::StakedWal'>>;

// widened names degrade gracefully
const Dynamic: MoveStruct<{ value: ReturnType<typeof bcs.u64> }, string> = Balance;
const t11 = Dynamic.typeTag();
const t12 = Dynamic.typeTag({ typeArguments: ['a', 'b', 'c'] });
type _11 = Expect<Equal<typeof t11, string>> | Expect<Equal<typeof t12, string>>;

console.log(t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12);
`;
