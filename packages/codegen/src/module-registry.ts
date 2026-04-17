// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { MoveModuleBuilder } from './move-module-builder.js';
import type { Ability, ModuleSummary } from './types/summary.js';

export class ModuleRegistry {
	readonly addressMappings: Record<string, string>;
	readonly #builders = new Map<string, MoveModuleBuilder>();

	constructor(addressMappings: Record<string, string> = {}) {
		this.addressMappings = addressMappings;
	}

	resolveAddress(address: string): string {
		return this.addressMappings[address] ?? address;
	}

	register(builder: MoveModuleBuilder): void {
		this.#builders.set(this.#keyOf(builder.summary.id.address, builder.summary.id.name), builder);
	}

	getBuilder(address: string, module: string): MoveModuleBuilder | undefined {
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
