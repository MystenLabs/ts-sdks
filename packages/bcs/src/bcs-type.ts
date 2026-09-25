// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase58, fromBase64, toBase58, toBase64, fromHex, toHex } from '@mysten/utils';
import { encoder } from './bcs-encode.js';
import { decoder } from './bcs-decode.js';
import { BcsReader } from './reader.js';
import type { BcsWriterOptions } from './writer.js';
import { BcsWriter } from './writer.js';
import type { EnumInputShape, EnumOutputShape, JoinString } from './types.js';

const { init: initDecode, buildTupleDecoder } = decoder;
const { fastSerialize, buildTupleEncoder } = encoder;

// Singleton reader/writer backed by the singleton decoder/encoder.
// Custom types that expect BcsReader/BcsWriter args get these.
// Standalone `new BcsReader(data)` / `new BcsWriter()` are independent.
const _reader = new BcsReader(undefined, decoder);
const _writer = new BcsWriter(undefined, encoder);

export interface BcsTypeOptions<T, Input = T, Name extends string = string> {
	name?: Name;
	validate?: (value: Input) => void;
}

export class BcsType<T, Input = T, const Name extends string = string> {
	$inferType!: T;
	$inferInput!: Input;
	name: Name;
	serializedSize: (value: Input, options?: BcsWriterOptions) => number | null;
	validate: (value: Input) => void;
	_codec: { read: () => T; write: (value: Input) => void; kind?: string };
	_validatedWrite: (value: Input) => void;

	toBytes: (value: Input, options?: BcsWriterOptions) => Uint8Array<ArrayBuffer>;

	constructor(
		options: {
			name: Name;
			read: ((reader: BcsReader) => T) | (() => T);
			write: ((value: Input, writer: BcsWriter) => void) | ((value: Input) => void);
			serialize?: (value: Input, options?: BcsWriterOptions) => Uint8Array<ArrayBuffer>;
			serializedSize?: (value: Input) => number | null;
			validate?: (value: Input) => void;
			kind?: string;
		} & BcsTypeOptions<T, Input, Name>,
	) {
		this.name = options.name;
		this.serializedSize = options.serializedSize ?? (() => null);
		this.validate = options.validate ?? (() => {});

		// For internal types (0-arg read/write), assign directly — preserves the
		// function's unique identity (critical for codegen SFI isolation).
		// For legacy custom types (1+ args), wrap to pass the singleton reader/writer.
		let readValue: () => T;
		let writeValue: (value: Input) => void;
		if (options.read.length === 0) {
			readValue = options.read as () => T;
		} else {
			const readFn = options.read as (reader: BcsReader) => T;
			readValue = (() => readFn(_reader)) as () => T;
		}
		if (options.write.length <= 1) {
			writeValue = options.write as (value: Input) => void;
		} else {
			const rawWriteFn = options.write as (value: Input, writer: BcsWriter) => void;
			writeValue = ((value: Input) => rawWriteFn(value, _writer)) as (value: Input) => void;
		}
		// _codec.write is the raw write — no validation.
		// _validatedWrite is validate + write, used by compound builders for per-field checks.
		this._codec = { read: readValue, write: writeValue, kind: options.kind };
		const validateFn = this.validate;
		this._validatedWrite = options.validate
			? (value: Input) => {
					validateFn(value);
					writeValue(value);
				}
			: writeValue;

		const writeFn = writeValue;
		const serializeFn = options.serialize ?? null;

		this.toBytes = serializeFn
			? (value: Input, options?: BcsWriterOptions) => {
					validateFn(value);
					return serializeFn(value, options);
				}
			: (value: Input, options?: BcsWriterOptions) => {
					validateFn(value);
					return fastSerialize(
						writeFn as (value: unknown) => void,
						value,
						options?.maxSize ?? undefined,
					);
				};
	}

	/** @deprecated Use {@link parse} instead. */
	read(reader: BcsReader): T {
		const saved = decoder.save();
		try {
			decoder.init(reader.bytes);
			decoder.offset = reader.bytePosition;
			const result = this._codec.read();
			if (!(decoder.offset <= reader.bytes.length)) {
				throw new RangeError(
					`BCS deserialization failed: expected at least ${decoder.offset} bytes, got ${reader.bytes.length}`,
				);
			}
			reader.bytePosition = decoder.offset;
			return result;
		} finally {
			decoder.restore(saved);
		}
	}

	parse(bytes: Uint8Array): T {
		const saved = decoder.save();
		try {
			initDecode(bytes);
			const result = this._codec.read();
			if (!(decoder.offset <= bytes.length)) {
				throw new RangeError(
					`BCS deserialization failed: expected at least ${decoder.offset} bytes, got ${bytes.length}`,
				);
			}
			return result;
		} finally {
			decoder.restore(saved);
		}
	}

	/** @deprecated Use {@link toBytes} or {@link serialize} instead. */
	write(value: Input, _writer?: BcsWriter) {
		this._validatedWrite(value);
	}

	fromHex(hex: string) {
		return this.parse(fromHex(hex));
	}

	fromBase58(b58: string) {
		return this.parse(fromBase58(b58));
	}

	fromBase64(b64: string) {
		return this.parse(fromBase64(b64));
	}

	serialize(value: Input, options?: BcsWriterOptions): SerializedBcs<T, Input> {
		return new SerializedBcs(this, this.toBytes(value, options));
	}

	toHex(value: Input): string {
		return toHex(this.toBytes(value));
	}

	toBase64(value: Input): string {
		return toBase64(this.toBytes(value));
	}

	toBase58(value: Input): string {
		return toBase58(this.toBytes(value));
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
		const parentRead = this._codec.read;
		const parentRawWrite = this._codec.write;
		const parentSerializedSize = this.serializedSize;
		const parentValidate = this.validate;

		return new BcsType<T2, Input2, NewName>({
			name: (name ?? this.name) as NewName,
			read: output ? () => output(parentRead()) : (parentRead as never),
			write: input ? (value: Input2) => parentRawWrite(input(value)) : (parentRawWrite as never),
			serializedSize: (value) => parentSerializedSize(input ? input(value) : (value as never)),
			validate: (value) => {
				validate?.(value);
				parentValidate(input ? input(value) : (value as never));
			},
		});
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
	read: () => T;
	write: (value: Input) => void;
	kind?: string;
} & BcsTypeOptions<T, Input, Name>) {
	return new BcsType<T, Input, Name>({
		...options,
		serializedSize: () => size,
	});
}

export function uIntBcsType<const Name extends string = string>({
	...options
}: {
	name: Name;
	size: number;
	maxValue: number;
	read: () => number;
	write: (value: number) => void;
	kind?: string;
} & BcsTypeOptions<number, number, Name>) {
	return fixedSizeBcsType<number, number, Name>({
		...options,
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
	...options
}: {
	name: Name;
	size: number;
	maxValue: bigint;
	read: () => string;
	write: (value: string | number | bigint) => void;
	kind?: string;
} & BcsTypeOptions<string, string | number | bigint>) {
	return fixedSizeBcsType<string, string | number | bigint, Name>({
		...options,
		validate: (val) => {
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
		read: () => getType()._codec.read(),
		serializedSize: (value) => getType().serializedSize(value),
		write: (value: Input) => getType()._validatedWrite(value),
		serialize: (value, options) => getType().toBytes(value, options),
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
	constructor({
		name,
		fields,
		decoder: customDecoder,
		encoder: customEncoder,
		...options
	}: BcsStructOptions<T, Name> & { decoder?: typeof decoder; encoder?: typeof encoder }) {
		const canonicalOrder = Object.entries(fields);
		const keys = canonicalOrder.map(([key]) => key);
		const types = canonicalOrder.map(([, type]) => type);

		const encode = (customEncoder ?? encoder).buildStructEncoder(
			keys,
			types.map((t) => t._validatedWrite),
		);
		const decode = (customDecoder ?? decoder).buildStructDecoder(
			keys,
			types.map((t) => t._codec.read),
		);

		// Compound builders return type-erased closures (() => unknown / (v: unknown) => void).
		// Cast via `as never` to bridge to BcsType's typed constructor — safe because the
		// runtime values flowing through are always the correct types per the BCS schema.
		super({
			name,
			serializedSize: (values) => {
				let total = 0;
				for (const [field, type] of canonicalOrder) {
					const size = type.serializedSize(values[field]);
					if (size == null) return null;
					total += size;
				}
				return total;
			},
			read: decode as never,
			write: encode as never,
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
	constructor({
		fields,
		decoder: customDecoder,
		encoder: customEncoder,
		...options
	}: BcsEnumOptions<T, Name> & { decoder?: typeof decoder; encoder?: typeof encoder }) {
		const canonicalOrder = Object.entries(fields as object);
		const variantKeys = canonicalOrder.map(([key]) => key);
		const variantTypes = canonicalOrder.map(([, type]) => type as BcsType<any> | null);

		const encode = (customEncoder ?? encoder).buildEnumEncoder(
			variantKeys,
			variantTypes.map((t) => (t ? t._validatedWrite : null)),
		);
		const decode = (customDecoder ?? decoder).buildEnumDecoder(
			variantKeys,
			variantTypes.map((t) => (t ? t._codec.read : null)),
			options.name,
		);

		super({
			read: decode as never,
			write: encode as never,
			...options,
			validate: (value) => {
				options?.validate?.(value);
				if (typeof value !== 'object' || value == null) {
					throw new TypeError(`Expected object, found ${typeof value}`);
				}

				const keys = Object.keys(value).filter(
					(k) => value[k] !== undefined && Object.hasOwn(fields, k),
				);

				if (keys.length !== 1) {
					throw new TypeError(
						`Expected object with one key, but found ${keys.length} for type ${options.name}}`,
					);
				}

				const [variant] = keys;

				if (!Object.hasOwn(fields, variant)) {
					throw new TypeError(`Invalid enum variant ${variant}`);
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
		const encode = buildTupleEncoder(fields.map((type) => type._validatedWrite));
		const decode = buildTupleDecoder(fields.map((type) => type._codec.read));

		super({
			name: name ?? (`(${fields.map((t) => t.name).join(', ')})` as never),
			serializedSize: (values) => {
				let total = 0;
				for (let i = 0; i < fields.length; i++) {
					const size = fields[i].serializedSize(values[i]);
					if (size == null) return null;
					total += size;
				}
				return total;
			},
			read: decode as never,
			write: encode as never,
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
