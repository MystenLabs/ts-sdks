// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { MoveModuleBuilder } from './move-module-builder.js';
import type { Ability, ModuleSummary } from './types/summary.js';

/**
 * Shared context for a set of `MoveModuleBuilder`s generated together from a
 * single package summary. Centralizes cross-module lookups — dependency
 * traversal, ability resolution, address normalization — so callers don't
 * have to thread a `Record<string, MoveModuleBuilder>` through every method.
 *
 * Builders register themselves with the registry on construction, and the
 * registry is handed to `renderTypeSignature` via
 * `RenderTypeSignatureOptions.registry` when cross-module info is needed.
 */
export class ModuleRegistry {
	readonly addressMappings: Record<string, string>;
	readonly #builders = new Map<string, MoveModuleBuilder>();

	constructor(addressMappings: Record<string, string> = {}) {
		this.addressMappings = addressMappings;
	}

	resolveAddress(address: string): string {
		return this.addressMappings[address] ?? address;
	}

	/** Register a builder under its module id (`address::module`). */
	register(builder: MoveModuleBuilder): void {
		this.#builders.set(this.#keyOf(builder.summary.id.address, builder.summary.id.name), builder);
	}

	getBuilder(address: string, module: string): MoveModuleBuilder | undefined {
		// Accept either the canonical or resolved address — callers sometimes
		// hold one and sometimes the other depending on where the lookup
		// happens in the pipeline.
		return (
			this.#builders.get(this.#keyOf(address, module)) ??
			this.#builders.get(this.#keyOf(this.resolveAddress(address), module))
		);
	}

	getSummary(address: string, module: string): ModuleSummary | undefined {
		return this.getBuilder(address, module)?.summary;
	}

	getAbilities(address: string, module: string, name: string): Ability[] | undefined {
		const summary = this.getSummary(address, module);
		return summary?.structs[name]?.abilities ?? summary?.enums[name]?.abilities;
	}

	#keyOf(address: string, module: string): string {
		return `${address}::${module}`;
	}
}
