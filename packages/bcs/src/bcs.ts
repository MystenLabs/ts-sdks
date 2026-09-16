// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { encoder, compareBcsBytes } from './bcs-encode.js';
import { decoder } from './bcs-decode.js';

const {
	encodeU8,
	encodeU16,
	encodeU32,
	encodeU64,
	encodeU128,
	encodeU256,
	encodeBool,
	encodeFixedBytes,
	encodeString,
	encodeByteVector,
	writeUleb,
	ensure,
	buildVectorEncoder,
	buildFixedArrayEncoder,
	buildOptionEncoder,
	buildMapEncoder,
} = encoder;
const {
	decodeU8,
	decodeU16,
	decodeU32,
	decodeU64,
	decodeU128,
	decodeU256,
	decodeBool,
	decodeFixedBytes,
	decodeString,
	decodeByteVector,
	readUleb,
	buildVectorDecoder,
	buildFixedArrayDecoder,
	buildOptionDecoder,
	buildMapDecoder,
} = decoder;
import type { BcsTypeOptions } from './bcs-type.js';
import {
	BcsEnum,
	BcsStruct,
	BcsTuple,
	BcsType,
	bigUIntBcsType,
	fixedSizeBcsType,
	lazyBcsType,
	uIntBcsType,
} from './bcs-type.js';
import type {
	EnumInputShape,
	EnumOutputShape,
	InferBcsInput,
	InferBcsType,
	JoinString,
} from './types.js';

/** Byte length of a ULEB128-encoded value, without allocating. */
function ulebLength(n: number): number {
	if (n < 0x80) return 1;
	if (n < 0x4000) return 2;
	if (n < 0x200000) return 3;
	if (n < 0x10000000) return 4;
	if (n < 0x800000000) return 5;
	if (n < 0x40000000000) return 6;
	if (n < 0x2000000000000) return 7;
	return 8;
}

function fixedArray<T extends BcsType<any>, Name extends string = string>(
	size: number,
	type: T,
	options?: BcsTypeOptions<
		InferBcsType<T>[],
		Iterable<InferBcsInput<T>> & { length: number },
		Name
	>,
): BcsType<InferBcsType<T>[], Iterable<InferBcsInput<T>> & { length: number }, Name>;
function fixedArray<T, Input, Name extends string = string>(
	size: number,
	type: BcsType<T, Input>,
	options?: BcsTypeOptions<T[], Iterable<Input> & { length: number }, Name>,
): BcsType<T[], Iterable<Input> & { length: number }, Name>;
function fixedArray<T extends BcsType<any>, Name extends string = `${T['name']}[${number}]`>(
	size: number,
	type: T,
	options?: BcsTypeOptions<
		InferBcsType<T>[],
		Iterable<InferBcsInput<T>> & { length: number },
		Name
	>,
): BcsType<InferBcsType<T>[], Iterable<InferBcsInput<T>> & { length: number }, Name> {
	const fixedElementSize =
		type.name === 'u8' ? 1 : type.name === 'u16' ? 2 : type.name === 'u32' ? 4 : 0;
	const encode = buildFixedArrayEncoder(size, type._validatedWrite, type._codec.kind);
	const decode = buildFixedArrayDecoder(size, type._codec.read, type._codec.kind);
	return new BcsType<InferBcsType<T>[], Iterable<InferBcsInput<T>> & { length: number }, Name>({
		read: decode as never,
		write: encode as never,
		serializedSize: fixedElementSize > 0 ? () => size * fixedElementSize : undefined,
		...options,
		name: (options?.name ?? `${type.name}[${size}]`) as Name,
		validate: (value) => {
			options?.validate?.(value);
			if (!value || typeof value !== 'object' || !('length' in value))
				throw new TypeError(`Expected array, found ${typeof value}`);
			if (value.length !== size)
				throw new TypeError(`Expected array of length ${size}, found ${value.length}`);
		},
	});
}

function option<T extends BcsType<any>>(
	type: T,
): BcsType<InferBcsType<T> | null, InferBcsInput<T> | null | undefined, `Option<${T['name']}>`>;
function option<T, Input, Name extends string = string>(
	type: BcsType<T, Input, Name>,
): BcsType<T | null, Input | null | undefined>;
function option<T extends BcsType<any>>(
	type: T,
): BcsType<InferBcsType<T> | null, InferBcsInput<T> | null | undefined, `Option<${T['name']}>`> {
	const decode = buildOptionDecoder(type._codec.read);
	const encode = buildOptionEncoder(type._validatedWrite as (v: unknown) => void);
	return new BcsType<
		InferBcsType<T> | null,
		InferBcsInput<T> | null | undefined,
		`Option<${T['name']}>`
	>({
		name: `Option<${type.name}>` as `Option<${T['name']}>`,
		read: decode.decode as never,
		write: encode as never,
	});
}

function vector<T extends BcsType<any>, Name extends string = `vector<${T['name']}>`>(
	type: T,
	options?: BcsTypeOptions<
		InferBcsType<T>[],
		Iterable<InferBcsInput<T>> & { length: number },
		Name
	>,
): BcsType<InferBcsType<T>[], Iterable<InferBcsInput<T>> & { length: number }, Name>;
function vector<T, Input, Name extends string = string>(
	type: BcsType<T, Input, Name>,
	options?: BcsTypeOptions<T[], Iterable<Input> & { length: number }, `vector<${Name}>`>,
): BcsType<T[], Iterable<Input> & { length: number }, `vector<${Name}>`>;
function vector<T extends BcsType<any>, Name extends string = `vector<${T['name']}>`>(
	type: T,
	options?: BcsTypeOptions<
		InferBcsType<T>[],
		Iterable<InferBcsInput<T>> & { length: number },
		Name
	>,
): BcsType<InferBcsType<T>[], Iterable<InferBcsInput<T>> & { length: number }, Name> {
	const elementSize =
		type.name === 'u8' ? 1 : type.name === 'u16' ? 2 : type.name === 'u32' ? 4 : 0;
	const encode = buildVectorEncoder(type._validatedWrite, type._codec.kind);
	const decode = buildVectorDecoder(type._codec.read, type._codec.kind);
	return new BcsType<InferBcsType<T>[], Iterable<InferBcsInput<T>> & { length: number }, Name>({
		read: decode as never,
		write: encode as never,
		serializedSize:
			elementSize > 0
				? (value) => {
						const arr = value as Iterable<InferBcsInput<T>> & { length: number };
						return ulebLength(arr.length) + arr.length * elementSize;
					}
				: undefined,
		...options,
		name: (options?.name ?? `vector<${type.name}>`) as Name,
		validate: (value) => {
			options?.validate?.(value);
			if (!value || typeof value !== 'object' || !('length' in value))
				throw new TypeError(`Expected array, found ${typeof value}`);
		},
	});
}

export { compareBcsBytes };

function map<K extends BcsType<any>, V extends BcsType<any>>(
	keyType: K,
	valueType: V,
): BcsType<
	Map<InferBcsType<K>, InferBcsType<V>>,
	Map<InferBcsInput<K>, InferBcsInput<V>>,
	`Map<${K['name']}, ${V['name']}>`
>;
function map<K, V, InputK = K, InputV = V>(
	keyType: BcsType<K, InputK>,
	valueType: BcsType<V, InputV>,
): BcsType<Map<K, V>, Map<InputK, InputV>, `Map<${string}, ${string}>`>;
function map<K extends BcsType<any>, V extends BcsType<any>>(
	keyType: K,
	valueType: V,
): BcsType<
	Map<InferBcsType<K>, InferBcsType<V>>,
	Map<InferBcsInput<K>, InferBcsInput<V>>,
	`Map<${K['name']}, ${V['name']}>`
> {
	const decode = buildMapDecoder(keyType._codec.read, valueType._codec.read);
	const encode = buildMapEncoder(
		keyType._validatedWrite as (v: unknown) => void,
		valueType._validatedWrite as (v: unknown) => void,
	);
	return new BcsType<
		Map<InferBcsType<K>, InferBcsType<V>>,
		Map<InferBcsInput<K>, InferBcsInput<V>>,
		`Map<${K['name']}, ${V['name']}>`
	>({
		name: `Map<${keyType.name}, ${valueType.name}>` as `Map<${K['name']}, ${V['name']}>`,
		read: decode as never,
		write: encode as never,
	});
}

export const bcs = {
	/**
	 * Creates a BcsType that can be used to read and write an 8-bit unsigned integer.
	 * @example
	 * bcs.u8().serialize(255).toBytes() // Uint8Array [ 255 ]
	 */
	u8(options?: BcsTypeOptions<number>) {
		return uIntBcsType({
			size: 1,
			maxValue: 2 ** 8 - 1,
			...options,
			name: (options?.name ?? 'u8') as 'u8',
			read: decodeU8,
			write: encodeU8,
			kind: 'u8',
		});
	},
	/**
	 * Creates a BcsType that can be used to read and write a 16-bit unsigned integer.
	 * @example
	 * bcs.u16().serialize(65535).toBytes() // Uint8Array [ 255, 255 ]
	 */
	u16(options?: BcsTypeOptions<number>) {
		return uIntBcsType({
			size: 2,
			maxValue: 2 ** 16 - 1,
			...options,
			name: (options?.name ?? 'u16') as 'u16',
			read: decodeU16,
			write: encodeU16,
			kind: 'u16',
		});
	},
	/**
	 * Creates a BcsType that can be used to read and write a 32-bit unsigned integer.
	 * @example
	 * bcs.u32().serialize(4294967295).toBytes() // Uint8Array [ 255, 255, 255, 255 ]
	 */
	u32(options?: BcsTypeOptions<number>) {
		return uIntBcsType({
			size: 4,
			maxValue: 2 ** 32 - 1,
			...options,
			name: (options?.name ?? 'u32') as 'u32',
			read: decodeU32,
			write: encodeU32,
			kind: 'u32',
		});
	},
	/**
	 * Creates a BcsType that can be used to read and write a 64-bit unsigned integer.
	 * @example
	 * bcs.u64().serialize(1).toBytes() // Uint8Array [ 1, 0, 0, 0, 0, 0, 0, 0 ]
	 */
	u64(options?: BcsTypeOptions<string, number | bigint | string>) {
		return bigUIntBcsType({
			size: 8,
			maxValue: 2n ** 64n - 1n,
			...options,
			name: (options?.name ?? 'u64') as 'u64',
			read: decodeU64,
			write: encodeU64,
			kind: 'u64',
		});
	},
	/**
	 * Creates a BcsType that can be used to read and write a 128-bit unsigned integer.
	 * @example
	 * bcs.u128().serialize(1).toBytes() // Uint8Array [ 1, ..., 0 ]
	 */
	u128(options?: BcsTypeOptions<string, number | bigint | string>) {
		return bigUIntBcsType({
			size: 16,
			maxValue: 2n ** 128n - 1n,
			...options,
			name: (options?.name ?? 'u128') as 'u128',
			read: decodeU128,
			write: encodeU128,
			kind: 'u128',
		});
	},
	/**
	 * Creates a BcsType that can be used to read and write a 256-bit unsigned integer.
	 * @example
	 * bcs.u256().serialize(1).toBytes() // Uint8Array [ 1, ..., 0 ]
	 */
	u256(options?: BcsTypeOptions<string, number | bigint | string>) {
		return bigUIntBcsType({
			size: 32,
			maxValue: 2n ** 256n - 1n,
			...options,
			name: (options?.name ?? 'u256') as 'u256',
			read: decodeU256,
			write: encodeU256,
			kind: 'u256',
		});
	},
	/**
	 * Creates a BcsType that can be used to read and write boolean values.
	 * @example
	 * bcs.bool().serialize(true).toBytes() // Uint8Array [ 1 ]
	 */
	bool(options?: BcsTypeOptions<boolean>) {
		return fixedSizeBcsType({
			size: 1,
			read: decodeBool,
			write: encodeBool,
			kind: 'bool',
			...options,
			name: (options?.name ?? 'bool') as 'bool',
			validate: (value) => {
				options?.validate?.(value);
				if (typeof value !== 'boolean')
					throw new TypeError(`Expected boolean, found ${typeof value}`);
			},
		});
	},
	/**
	 * Creates a BcsType that can be used to read and write unsigned LEB encoded integers
	 */
	uleb128(options?: BcsTypeOptions<number>) {
		return new BcsType<number, number, 'uleb128'>({
			read: readUleb,
			write: (v: number) => {
				ensure(10);
				writeUleb(v);
			},
			...options,
			name: (options?.name ?? 'uleb128') as 'uleb128',
		});
	},
	/**
	 * Creates a BcsType representing a fixed length byte array
	 * @param size The number of bytes this types represents
	 * @example
	 * bcs.bytes(3).serialize(new Uint8Array([1, 2, 3])).toBytes() // Uint8Array [1, 2, 3]
	 */
	bytes<T extends number>(size: T, options?: BcsTypeOptions<Uint8Array, Iterable<number>>) {
		return fixedSizeBcsType<Uint8Array, Iterable<number>, `bytes[${T}]`>({
			size,
			read: () => decodeFixedBytes(size),
			write: (v) => encodeFixedBytes(v, size),
			kind: 'fixedBytes',
			...options,
			name: (options?.name ?? `bytes[${size}]`) as `bytes[${T}]`,
			validate: (value) => {
				options?.validate?.(value);
				if (!value || typeof value !== 'object' || !('length' in value))
					throw new TypeError(`Expected array, found ${typeof value}`);
				if (value.length !== size)
					throw new TypeError(`Expected array of length ${size}, found ${value.length}`);
			},
		});
	},
	/**
	 * Creates a BcsType representing a variable length byte array
	 *
	 * @example
	 * bcs.byteVector().serialize([1, 2, 3]).toBytes() // Uint8Array [3, 1, 2, 3]
	 */
	byteVector(options?: BcsTypeOptions<Uint8Array, Iterable<number>>) {
		return new BcsType<Uint8Array, Iterable<number>, 'vector<u8>'>({
			read: decodeByteVector,
			write: encodeByteVector,
			kind: 'byteVector',
			...options,
			name: (options?.name ?? 'vector<u8>') as 'vector<u8>',
			serializedSize: (value) => {
				const length = 'length' in value ? (value.length as number) : null;
				return length == null ? null : ulebLength(length) + length;
			},
			validate: (value) => {
				options?.validate?.(value);
				if (!value || typeof value !== 'object' || !('length' in value))
					throw new TypeError(`Expected array, found ${typeof value}`);
			},
		});
	},
	/**
	 * Creates a BcsType that can ser/de string values.  Strings will be UTF-8 encoded
	 * @example
	 * bcs.string().serialize('a').toBytes() // Uint8Array [ 1, 97 ]
	 */
	string(options?: BcsTypeOptions<string>) {
		return new BcsType<string, string, 'string'>({
			...options,
			name: (options?.name ?? 'string') as 'string',
			read: decodeString,
			write: encodeString,
			kind: 'string',
			validate: (value) => {
				if (typeof value !== 'string') {
					throw new TypeError(
						`Invalid ${options?.name ?? 'string'} value: ${value}. Expected string`,
					);
				}
				options?.validate?.(value);
			},
		});
	},
	/**
	 * Creates a BcsType that represents a fixed length array of a given type
	 * @param size The number of elements in the array
	 * @param type The BcsType of each element in the array
	 * @example
	 * bcs.fixedArray(3, bcs.u8()).serialize([1, 2, 3]).toBytes() // Uint8Array [ 1, 2, 3 ]
	 */
	fixedArray,

	/**
	 * Creates a BcsType representing an optional value
	 * @param type The BcsType of the optional value
	 * @example
	 * bcs.option(bcs.u8()).serialize(null).toBytes() // Uint8Array [ 0 ]
	 * bcs.option(bcs.u8()).serialize(1).toBytes() // Uint8Array [ 1, 1 ]
	 */
	option,

	/**
	 * Creates a BcsType representing a variable length vector of a given type
	 * @param type The BcsType of each element in the vector
	 *
	 * @example
	 * bcs.vector(bcs.u8()).toBytes([1, 2, 3]) // Uint8Array [ 3, 1, 2, 3 ]
	 */
	vector,

	/**
	 * Creates a BcsType representing a tuple of a given set of types
	 * @param types The BcsTypes for each element in the tuple
	 *
	 * @example
	 * const tuple = bcs.tuple([bcs.u8(), bcs.string(), bcs.bool()])
	 * tuple.serialize([1, 'a', true]).toBytes() // Uint8Array [ 1, 1, 97, 1 ]
	 */
	tuple<
		const T extends readonly BcsType<any, any>[],
		const Name extends string =
			`(${JoinString<{ [K in keyof T]: T[K] extends BcsType<any, any, infer T> ? T : never }, ', '>})`,
	>(
		fields: T,
		options?: BcsTypeOptions<
			{ -readonly [K in keyof T]: T[K] extends BcsType<infer T, any> ? T : never },
			{ [K in keyof T]: T[K] extends BcsType<any, infer T> ? T : never },
			Name
		>,
	) {
		return new BcsTuple<T, Name>({ fields, ...options });
	},
	/**
	 * Creates a BcsType representing a struct of a given set of fields
	 * @param name The name of the struct
	 * @param fields The fields of the struct. The order of the fields affects how data is serialized and deserialized
	 *
	 * @example
	 * const struct = bcs.struct('MyStruct', {
	 *  a: bcs.u8(),
	 *  b: bcs.string(),
	 * })
	 * struct.serialize({ a: 1, b: 'a' }).toBytes() // Uint8Array [ 1, 1, 97 ]
	 */
	struct<T extends Record<string, BcsType<any>>, const Name extends string = string>(
		name: Name,
		fields: T,
		options?: Omit<
			BcsTypeOptions<
				{ [K in keyof T]: T[K] extends BcsType<infer U, any> ? U : never },
				{ [K in keyof T]: T[K] extends BcsType<any, infer U> ? U : never }
			>,
			'name'
		>,
	) {
		return new BcsStruct<T>({ name, fields, ...options });
	},
	/**
	 * Creates a BcsType representing an enum of a given set of options
	 * @param name The name of the enum
	 * @param values The values of the enum. The order of the values affects how data is serialized and deserialized.
	 * null can be used to represent a variant with no data.
	 *
	 * @example
	 * const enum = bcs.enum('MyEnum', {
	 *   A: bcs.u8(),
	 *   B: bcs.string(),
	 *   C: null,
	 * })
	 * enum.serialize({ A: 1 }).toBytes() // Uint8Array [ 0, 1 ]
	 * enum.serialize({ B: 'a' }).toBytes() // Uint8Array [ 1, 1, 97 ]
	 * enum.serialize({ C: true }).toBytes() // Uint8Array [ 2 ]
	 */
	enum<T extends Record<string, BcsType<any> | null>, const Name extends string = string>(
		name: Name,
		fields: T,
		options?: Omit<
			BcsTypeOptions<
				EnumOutputShape<{ [K in keyof T]: T[K] extends BcsType<infer U, any, any> ? U : true }>,
				EnumInputShape<{
					[K in keyof T]: T[K] extends BcsType<any, infer U, any> ? U : boolean | object | null;
				}>,
				Name
			>,
			'name'
		>,
	) {
		return new BcsEnum<T, Name>({ name, fields, ...options });
	},
	/**
	 * Creates a BcsType representing a map of a given key and value type
	 * @param keyType The BcsType of the key
	 * @param valueType The BcsType of the value
	 * @example
	 * const map = bcs.map(bcs.u8(), bcs.string())
	 * map.serialize(new Map([[2, 'a']])).toBytes() // Uint8Array [ 1, 2, 1, 97 ]
	 */
	map,

	/**
	 * Creates a BcsType that wraps another BcsType which is lazily evaluated. This is useful for creating recursive types.
	 * @param cb A callback that returns the BcsType
	 */
	lazy<T extends BcsType<any>>(cb: () => T): T {
		return lazyBcsType(cb) as T;
	},
};
