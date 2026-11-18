// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Minimal Move `CompiledModule` bytes naming one module: the header, a module-handle table and an
 * identifier table, which is all `readMoveModuleName` reads.
 */
export function compiledModule(name: string): Uint8Array {
	const identifier = [name.length, ...new TextEncoder().encode(name)];

	return Uint8Array.from([
		// magic, version
		0xa1,
		0x1c,
		0xeb,
		0x0b,
		6,
		0,
		0,
		0,
		// module-handle and identifier tables
		2,
		0x1,
		0,
		2,
		0x7,
		2,
		identifier.length,
		// one module handle, naming identifier 0
		0,
		0,
		...identifier,
		0, // self module handle index
	]);
}
