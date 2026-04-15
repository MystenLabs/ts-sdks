// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { summaryFromDeserializedModule } from '../src/summary.js';

describe('summaryFromDeserializedModule', () => {
	it('preserves struct and enum abilities from deserialized modules', () => {
		const summary = summaryFromDeserializedModule({
			version: 1,
			self_module_handle_idx: 0,
			module_handles: [{ name: 0, address: 0 }],
			datatype_handles: [
				{
					name: 1,
					module: 0,
					abilities: 0x8,
					type_parameters: [],
				},
				{
					name: 2,
					module: 0,
					abilities: 0x3,
					type_parameters: [],
				},
			],
			function_handles: [],
			field_handles: [],
			friend_decls: [],
			struct_def_instantiations: [],
			function_instantiations: [],
			field_instantiations: [],
			signatures: [],
			identifiers: ['test_module', 'ObjectStruct', 'StatusEnum'],
			address_identifiers: ['0x1'],
			constant_pool: [],
			metadata: [],
			struct_defs: [
				{
					struct_handle: 0,
					field_information: { Declared: [] },
				},
			],
			function_defs: [],
			enum_defs: [
				{
					enum_handle: 1,
					variants: [],
				},
			],
			enum_def_instantiations: [],
			variant_handles: [],
			variant_instantiation_handles: [],
		} as any);

		expect(summary.structs.ObjectStruct?.abilities).toEqual(['Key']);
		expect(summary.enums.StatusEnum?.abilities).toEqual(['Copy', 'Drop']);
	});
});
