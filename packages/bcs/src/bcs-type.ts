// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase58, fromBase64, toBase58, toBase64, fromHex, toHex } from '@mysten/utils';
import { BcsReader } from './reader.js';
import { ulebEncode } from './uleb.js';
import type { BcsWriterOptions } from './writer.js';
import { BcsWriter } from './writer.js';
import type { EnumInputShape, EnumOutputShape, JoinString } from './types.js';

export interface BcsTypeOptions<T, Input = T, Name extends string = string> {
	name?: Name;
	validate?: (value: Input) => void;
}

export class BcsType<T, Input = T, const Name extends string = string> {
	$inferType!: T;
	$inferInput!: Input;
	name: Name;
	read: (reader: BcsReader) => T;
	serializedSize: (value: Input, options?: BcsWriterOptions) => number | null;
	validate: (value: Input) => void;
	#write: (value: Input, writer: BcsWriter) => void;
	#serialize: (value: Input, options?: BcsWriterOptions) => Uint8Array<ArrayBuffer>;
	// Set by transform: validates and writes while converting the input only once. Only used
	// while validate is still the one transform created, so a reassigned validate is honoured.
	#validatedWrite: ((value: Input, writer: BcsWriter) => void) | null = null;
	#validatedSerialize:
		((value: Input, options?: BcsWriterOptions) => Uint8Array<ArrayBuffer>) | null = null;
	#transformValidate: ((value: Input) => void) | null = null;

	constructor(
		options: {
			name: Name;
			read: (reader: BcsReader) => T;
			write: (value: Input, writer: BcsWriter) => void;
			serialize?: (value: Input, options?: BcsWriterOptions) => Uint8Array<ArrayBuffer>;
			serializedSize?: (value: Input) => number | null;
			validate?: (value: Input) => void;
		} & BcsTypeOptions<T, Input, Name>,
	) {
		this.name = options.name;
		this.read = options.read;
		this.serializedSize = options.serializedSize ?? (() => null);
		this.#write = options.write;
		this.#serialize =
			options.serialize ??
			((value, options) => {
				const writer = new BcsWriter({
					initialSize: this.serializedSize(value) ?? undefined,
					...options,
				});
				this.#write(value, writer);
				return writer.toBytes();
			});

		this.validate = options.validate ?? (() => {});
	}

	write(value: Input, writer: BcsWriter) {
		if (this.#validatedWrite && this.validate === this.#transformValidate) {
			this.#validatedWrite(value, writer);
			return;
		}
		this.validate(value);
		this.#write(value, writer);
	}

	serialize(value: Input, options?: BcsWriterOptions) {
		if (this.#validatedSerialize && this.validate === this.#transformValidate) {
			return new SerializedBcs(this, this.#validatedSerialize(value, options));
		}
		this.validate(value);
		return new SerializedBcs(this, this.#serialize(value, options));
	}

	parse(bytes: Uint8Array): T {
		const reader = new BcsReader(bytes);
		return this.read(reader);
	}

	fromHex(hex: string) {
		return this.parse(fromHex(hex));
	}

	fromBase58(b64: string) {
		return this.parse(fromBase58(b64));
	}

	fromBase64(b64: string) {
		return this.parse(fromBase64(b64));
	}

	transform<T2 = T, Input2 = Input, NewName extends string = Name>({
		name,
		input,
		output,
		validate,
	}: {
		input?: (val: Input2) => Input;
		output?: (value: T) => T2;
	} & BcsTypeOptions<T2, Input2, NewName>) {
		const type = new BcsType<T2, Input2, NewName>({
			name: (name ?? this.name) as NewName,
			read: (reader) => (output ? output(this.read(reader)) : (this.read(reader) as never)),
			write: (value, writer) => this.#write(input ? input(value) : (value as never), writer),
			serializedSize: (value) => this.serializedSize(input ? input(value) : (value as never)),
			serialize: (value, options) =>
				this.#serialize(input ? input(value) : (value as never), options),
			validate: (value) => {
				validate?.(value);
				this.validate(input ? input(value) : (value as never));
			},
		});

		// Equivalent to validate() followed by the write above, but calls input() once instead of twice
		type.#transformValidate = type.validate;
		type.#validatedWrite = (value, writer) => {
			validate?.(value);
			this.write(input ? input(value) : (value as never), writer);
		};
		type.#validatedSerialize = (value, options) => {
			validate?.(value);
			const converted = input ? input(value) : (value as never);
			this.validate(converted);
			return this.#serialize(converted, options);
		};

		return type;
	}
}

const SERIALIZED_BCS_BRAND = Symbol.for('@mysten/serialized-bcs') as never;
export function isSerializedBcs(obj: unknown): obj is SerializedBcs<unknown> {
	return !!obj && typeof obj === 'object' && (obj as any)[SERIALIZED_BCS_BRAND] === true;
}

export class SerializedBcs<T, Input = T> {
	#schema: BcsType<T, Input>;
	#bytes: Uint8Array<ArrayBuffer>;

	// Used to brand SerializedBcs so that they can be identified, even between multiple copies
	// of the @mysten/bcs package are installed
	get [SERIALIZED_BCS_BRAND]() {
		return true;
	}

	constructor(schema: BcsType<T, Input>, bytes: Uint8Array<ArrayBuffer>) {
		this.#schema = schema;
		this.#bytes = bytes;
	}

	toBytes() {
		return this.#bytes;
	}

	toHex() {
		return toHex(this.#bytes);
	}

	toBase64() {
		return toBase64(this.#bytes);
	}

	toBase58() {
		return toBase58(this.#bytes);
	}

	parse() {
		return this.#schema.parse(this.#bytes);
	}
}

export function fixedSizeBcsType<T, Input = T, const Name extends string = string>({
	size,
	...options
}: {
	name: Name;
	size: number;
	read: (reader: BcsReader) => T;
	write: (value: Input, writer: BcsWriter) => void;
} & BcsTypeOptions<T, Input, Name>) {
	return new BcsType<T, Input, Name>({
		...options,
		serializedSize: () => size,
	});
}

export function uIntBcsType<const Name extends string = string>({
	readMethod,
	writeMethod,
	...options
}: {
	name: Name;
	size: number;
	readMethod: `read${8 | 16 | 32}`;
	writeMethod: `write${8 | 16 | 32}`;
	maxValue: number;
} & BcsTypeOptions<number, number, Name>) {
	return fixedSizeBcsType<number, number, Name>({
		...options,
		read: (reader) => reader[readMethod](),
		write: (value, writer) => writer[writeMethod](value),
		validate: (value) => {
			if (value < 0 || value > options.maxValue) {
				throw new TypeError(
					`Invalid ${options.name} value: ${value}. Expected value in range 0-${options.maxValue}`,
				);
			}
			options.validate?.(value);
		},
	});
}

export function bigUIntBcsType<const Name extends string = string>({
	readMethod,
	writeMethod,
	...options
}: {
	name: Name;
	size: number;
	readMethod: `read${64 | 128 | 256}`;
	writeMethod: `write${64 | 128 | 256}`;
	maxValue: bigint;
} & BcsTypeOptions<string, string | number | bigint>) {
	return fixedSizeBcsType<string, string | number | bigint, Name>({
		...options,
		read: (reader) => reader[readMethod](),
		write: (value, writer) => writer[writeMethod](toSafeInteger(value) ?? BigInt(value)),
		validate: (val) => {
			// Every big uint type can hold any safe integer, so those skip BigInt parsing
			if (toSafeInteger(val) !== null) {
				options.validate?.(BigInt(val));
				return;
			}
			const value = BigInt(val);
			if (value < 0 || value > options.maxValue) {
				throw new TypeError(
					`Invalid ${options.name} value: ${value}. Expected value in range 0-${options.maxValue}`,
				);
			}
			options.validate?.(value);
		},
	});
}

/**
 * Returns the value as a number when it is a non-negative safe integer, or a decimal string
 * short enough to always be one, and null otherwise (callers fall back to BigInt).
 */
function toSafeInteger(value: string | number | bigint): number | null {
	if (typeof value === 'number') {
		return value >= 0 && Number.isSafeInteger(value) ? value : null;
	}
	if (typeof value === 'string' && value.length > 0 && value.length <= 15) {
		let result = 0;
		for (let i = 0; i < value.length; i++) {
			const digit = value.charCodeAt(i) - 48;
			if (digit < 0 || digit > 9) {
				return null;
			}
			result = result * 10 + digit;
		}
		return result;
	}
	return null;
}

export function dynamicSizeBcsType<T, Input = T, const Name extends string = string>({
	serialize,
	...options
}: {
	name: Name;
	read: (reader: BcsReader) => T;
	serialize: (value: Input, options?: BcsWriterOptions) => Uint8Array<ArrayBuffer>;
} & BcsTypeOptions<T, Input>) {
	const type = new BcsType<T, Input>({
		...options,
		serialize,
		write: (value, writer) => {
			for (const byte of type.serialize(value).toBytes()) {
				writer.write8(byte);
			}
		},
	});

	return type;
}

export function stringLikeBcsType<const Name extends string = string>({
	toBytes,
	fromBytes,
	...options
}: {
	name: Name;
	toBytes: (value: string) => Uint8Array;
	fromBytes: (bytes: Uint8Array) => string;
	serializedSize?: (value: string) => number | null;
} & BcsTypeOptions<string, string, Name>) {
	return new BcsType<string, string, Name>({
		...options,
		read: (reader) => {
			const length = reader.readULEB();
			const bytes = reader.readBytes(length);

			return fromBytes(bytes);
		},
		write: (hex, writer) => {
			const bytes = toBytes(hex);
			writer.writeULEB(bytes.length);
			writer.writeBytes(bytes);
		},
		serialize: (value) => {
			const bytes = toBytes(value);
			const size = ulebEncode(bytes.length);
			const result = new Uint8Array(size.length + bytes.length);
			result.set(size, 0);
			result.set(bytes, size.length);

			return result;
		},
		validate: (value) => {
			if (typeof value !== 'string') {
				throw new TypeError(`Invalid ${options.name} value: ${value}. Expected string`);
			}
			options.validate?.(value);
		},
	});
}

export function lazyBcsType<T, Input>(cb: () => BcsType<T, Input>) {
	let lazyType: BcsType<T, Input> | null = null;
	function getType() {
		if (!lazyType) {
			lazyType = cb();
		}
		return lazyType;
	}

	return new BcsType<T, Input>({
		name: 'lazy' as never,
		read: (data) => getType().read(data),
		serializedSize: (value) => getType().serializedSize(value),
		write: (value, writer) => getType().write(value, writer),
		serialize: (value, options) => getType().serialize(value, options).toBytes(),
	});
}

export interface BcsStructOptions<
	T extends Record<string, BcsType<any>>,
	Name extends string = string,
> extends Omit<
	BcsTypeOptions<
		{
			[K in keyof T]: T[K] extends BcsType<infer U, any> ? U : never;
		},
		{
			[K in keyof T]: T[K] extends BcsType<any, infer U> ? U : never;
		},
		Name
	>,
	'name'
> {
	name: Name;
	fields: T;
}

export class BcsStruct<
	T extends Record<string, BcsType<any>>,
	const Name extends string = string,
> extends BcsType<
	{
		[K in keyof T]: T[K] extends BcsType<infer U, any> ? U : never;
	},
	{
		[K in keyof T]: T[K] extends BcsType<any, infer U> ? U : never;
	},
	Name
> {
	constructor({ name, fields, ...options }: BcsStructOptions<T, Name>) {
		const fieldNames = Object.keys(fields);
		const fieldTypes = fieldNames.map((field) => fields[field]);
		const fieldCount = fieldNames.length;

		super({
			name,
			serializedSize: (values) => {
				let total = 0;
				for (let i = 0; i < fieldCount; i++) {
					const size = fieldTypes[i].serializedSize(values[fieldNames[i]]);
					if (size == null) {
						return null;
					}

					total += size;
				}

				return total;
			},
			read: (reader) => {
				const result: Record<string, unknown> = {};
				for (let i = 0; i < fieldCount; i++) {
					result[fieldNames[i]] = fieldTypes[i].read(reader);
				}

				return result as never;
			},
			write: (value, writer) => {
				for (let i = 0; i < fieldCount; i++) {
					fieldTypes[i].write(value[fieldNames[i]], writer);
				}
			},
			...options,
			validate: (value) => {
				options?.validate?.(value);
				if (typeof value !== 'object' || value == null) {
					throw new TypeError(`Expected object, found ${typeof value}`);
				}
			},
		});
	}
}

export interface BcsEnumOptions<
	T extends Record<string, BcsType<any> | null>,
	Name extends string = string,
> extends Omit<
	BcsTypeOptions<
		EnumOutputShape<{
			[K in keyof T]: T[K] extends BcsType<infer U, any, any> ? U : true;
		}>,
		EnumInputShape<{
			[K in keyof T]: T[K] extends BcsType<any, infer U, any> ? U : boolean | object | null;
		}>,
		Name
	>,
	'name'
> {
	name: Name;
	fields: T;
}

export class BcsEnum<
	T extends Record<string, BcsType<any> | null>,
	const Name extends string = string,
> extends BcsType<
	EnumOutputShape<{
		[K in keyof T]: T[K] extends BcsType<infer U, any> ? U : true;
	}>,
	EnumInputShape<{
		[K in keyof T]: T[K] extends BcsType<any, infer U, any> ? U : boolean | object | null;
	}>,
	Name
> {
	constructor({ fields, ...options }: BcsEnumOptions<T, Name>) {
		const canonicalOrder = Object.entries(fields as object);
		const variantIndex = new Map(canonicalOrder.map(([name], i) => [name, i]));
		super({
			read: (reader) => {
				const index = reader.readULEB();

				const enumEntry = canonicalOrder[index];
				if (!enumEntry) {
					throw new TypeError(`Unknown value ${index} for enum ${options.name}`);
				}

				const [kind, type] = enumEntry;

				// Avoid a computed-key object literal, which V8 builds through a slow runtime path
				const result: Record<string, unknown> = {};
				result[kind] = type?.read(reader) ?? true;
				result.$kind = kind;

				return result as never;
			},
			write: (value, writer) => {
				// The first own key that names a variant selects it
				for (const name of Object.keys(value)) {
					const index = variantIndex.get(name);
					if (index !== undefined) {
						writer.writeULEB(index);
						canonicalOrder[index][1]?.write(value[name], writer);
						return;
					}
				}
			},
			...options,
			validate: (value) => {
				options?.validate?.(value);
				if (typeof value !== 'object' || value == null) {
					throw new TypeError(`Expected object, found ${typeof value}`);
				}

				let variantCount = 0;
				for (const key of Object.keys(value)) {
					if (value[key] !== undefined && variantIndex.has(key)) {
						variantCount++;
					}
				}

				if (variantCount !== 1) {
					throw new TypeError(
						`Expected object with one key, but found ${variantCount} for type ${options.name}}`,
					);
				}
			},
		});
	}
}

export interface BcsTupleOptions<
	T extends readonly BcsType<any>[],
	Name extends string,
> extends Omit<
	BcsTypeOptions<
		{
			-readonly [K in keyof T]: T[K] extends BcsType<infer T, any> ? T : never;
		},
		{
			[K in keyof T]: T[K] extends BcsType<any, infer T> ? T : never;
		},
		Name
	>,
	'name'
> {
	name?: Name;
	fields: T;
}

export class BcsTuple<
	const T extends readonly BcsType<any>[],
	const Name extends string =
		`(${JoinString<{ [K in keyof T]: T[K] extends BcsType<any, any, infer T> ? T : never }, ', '>})`,
> extends BcsType<
	{
		-readonly [K in keyof T]: T[K] extends BcsType<infer T, any> ? T : never;
	},
	{
		[K in keyof T]: T[K] extends BcsType<any, infer T> ? T : never;
	},
	Name
> {
	constructor({ fields, name, ...options }: BcsTupleOptions<T, Name>) {
		super({
			name: name ?? (`(${fields.map((t) => t.name).join(', ')})` as never),
			serializedSize: (values) => {
				let total = 0;
				for (let i = 0; i < fields.length; i++) {
					const size = fields[i].serializedSize(values[i]);
					if (size == null) {
						return null;
					}

					total += size;
				}

				return total;
			},
			read: (reader) => {
				const result: unknown[] = [];
				for (const field of fields) {
					result.push(field.read(reader));
				}
				return result as never;
			},
			write: (value, writer) => {
				for (let i = 0; i < fields.length; i++) {
					fields[i].write(value[i], writer);
				}
			},
			...options,
			validate: (value) => {
				options?.validate?.(value);
				if (!Array.isArray(value)) {
					throw new TypeError(`Expected array, found ${typeof value}`);
				}
				if (value.length !== fields.length) {
					throw new TypeError(`Expected array of length ${fields.length}, found ${value.length}`);
				}
			},
		});
	}
}
