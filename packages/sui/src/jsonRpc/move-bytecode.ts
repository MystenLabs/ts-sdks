// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

const MOVE_MAGIC = [0xa1, 0x1c, 0xeb, 0x0b];
const MOVE_VERSION_BYTES = 4;
const MODULE_HANDLES_TABLE = 0x1;
const IDENTIFIERS_TABLE = 0x7;

interface MoveTable {
	offset: number;
	byteLength: number;
}

const textDecoder = new TextDecoder();

/**
 * Extract the self module name from serialized Move `CompiledModule` bytes.
 *
 * Publish commands carry raw compiled module bytecode, not a Sui BCS object.
 * Sui BCS models package modules as opaque byte vectors in `MovePackage.moduleMap`.
 *
 * This mirrors the Move binary-format header/table layout just far enough to
 * resolve `self_module_handle_idx.name`. It does not deserialize instructions,
 * signatures, definitions, constants, or metadata.
 */
export function readMoveModuleName(bytes: Uint8Array): string {
	const reader = new MoveBytecodeReader(bytes);
	validateMoveMagic(reader);
	reader.skip(MOVE_VERSION_BYTES);

	const tableCount = reader.readUleb();
	const tables = new Map<number, MoveTable>();

	for (let i = 0; i < tableCount; i++) {
		const kind = reader.readU8();
		const offset = reader.readUleb();
		const byteLength = reader.readUleb();
		tables.set(kind, { offset, byteLength });
	}

	const dataOffset = reader.position;
	const tableByteLength = [...tables.values()].reduce(
		(max, table) => Math.max(max, table.offset + table.byteLength),
		0,
	);

	reader.seek(dataOffset + tableByteLength);
	const selfModuleHandleIndex = reader.readUleb();
	const moduleHandleTable = getTable(tables, MODULE_HANDLES_TABLE, 'module handles');
	const identifierTable = getTable(tables, IDENTIFIERS_TABLE, 'identifiers');
	const moduleNameIndex = readModuleHandleNameIndex(
		reader,
		dataOffset + moduleHandleTable.offset,
		moduleHandleTable.byteLength,
		selfModuleHandleIndex,
	);

	return readIdentifier(
		reader,
		dataOffset + identifierTable.offset,
		identifierTable.byteLength,
		moduleNameIndex,
	);
}

function validateMoveMagic(reader: MoveBytecodeReader) {
	for (const byte of MOVE_MAGIC) {
		if (reader.readU8() !== byte) {
			throw new Error('Invalid Move module bytecode');
		}
	}
}

function getTable(tables: Map<number, MoveTable>, kind: number, name: string): MoveTable {
	const table = tables.get(kind);
	if (!table) {
		throw new Error(`Move module bytecode is missing ${name} table`);
	}

	return table;
}

function readModuleHandleNameIndex(
	reader: MoveBytecodeReader,
	offset: number,
	byteLength: number,
	targetIndex: number,
): number {
	const end = offset + byteLength;
	reader.seek(offset);

	for (let index = 0; reader.position < end; index++) {
		reader.readUleb(end);
		const nameIndex = reader.readUleb(end);
		if (index === targetIndex) {
			return nameIndex;
		}
	}

	throw new Error('Move module bytecode has an invalid self module handle');
}

function readIdentifier(
	reader: MoveBytecodeReader,
	offset: number,
	byteLength: number,
	targetIndex: number,
): string {
	const end = offset + byteLength;
	reader.seek(offset);

	for (let index = 0; reader.position < end; index++) {
		const size = reader.readUleb(end);

		if (index === targetIndex) {
			return textDecoder.decode(reader.readBytes(size, end));
		}

		reader.skip(size, end);
	}

	throw new Error('Move module bytecode has an invalid self module name');
}

class MoveBytecodeReader {
	private offset = 0;

	constructor(private readonly bytes: Uint8Array) {}

	get position(): number {
		return this.offset;
	}

	seek(offset: number) {
		if (offset < 0 || offset > this.bytes.length) {
			throw new Error('Unexpected end of Move module bytecode');
		}
		this.offset = offset;
	}

	skip(length: number, end = this.bytes.length) {
		this.seekBounded(this.offset + length, end);
	}

	readBytes(length: number, end = this.bytes.length): Uint8Array {
		const start = this.offset;
		this.skip(length, end);
		return this.bytes.subarray(start, start + length);
	}

	readU8(end = this.bytes.length): number {
		if (this.offset >= end || this.offset >= this.bytes.length) {
			throw new Error('Unexpected end of Move module bytecode');
		}
		return this.bytes[this.offset++]!;
	}

	readUleb(end = this.bytes.length): number {
		let value = 0;
		let shift = 0;

		while (true) {
			const byte = this.readU8(end);
			value += (byte & 0x7f) * 2 ** shift;
			if ((byte & 0x80) === 0) {
				return value;
			}
			shift += 7;
			if (shift > 28) {
				throw new Error('Move module bytecode contains an oversized ULEB128 value');
			}
		}
	}

	private seekBounded(offset: number, end: number) {
		if (offset < 0 || offset > end || offset > this.bytes.length) {
			throw new Error('Unexpected end of Move module bytecode');
		}
		this.offset = offset;
	}
}
