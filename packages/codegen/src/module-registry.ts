// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { MoveModuleBuilder } from './move-module-builder.js';
import type { Ability, ModuleSummary } from './types/summary.js';

const HEX_ADDRESS = /^0x[0-9a-fA-F]{1,64}$/;

function normalizeAddress(address: string) {
	return HEX_ADDRESS.test(address) ? normalizeSuiAddress(address) : address;
}

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

	/**
	 * Look up a module by its resolved (canonical) address. Builders are keyed by the address
	 * used in their summaries, which may be a named address — this scans by resolving each
	 * builder's address instead.
	 */
	getSummaryByResolvedAddress(resolvedAddress: string, module: string): ModuleSummary | undefined {
		const direct = this.getSummary(resolvedAddress, module);
		if (direct) return direct;

		for (const builder of this.#builders.values()) {
			if (
				builder.summary.id.name === module &&
				normalizeAddress(this.resolveAddress(builder.summary.id.address)) ===
					normalizeAddress(resolvedAddress)
			) {
				return builder.summary;
			}
		}
		return undefined;
	}

	getAbilities(address: string, module: string, name: string): Ability[] | undefined {
		const summary = this.getSummary(address, module);
		return summary?.structs[name]?.abilities ?? summary?.enums[name]?.abilities;
	}

	/** Whether any loaded module belongs to a package with this resolved address. */
	hasResolvedAddress(resolvedAddress: string): boolean {
		const normalized = normalizeAddress(resolvedAddress);
		for (const builder of this.#builders.values()) {
			if (normalizeAddress(this.resolveAddress(builder.summary.id.address)) === normalized) {
				return true;
			}
		}
		return false;
	}

	#keyOf(address: string, module: string): string {
		return `${address}::${module}`;
	}
}
