// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { DeserializedModule, TypeSignature } from './types/deserialized.js';
import type {
	Ability,
	EnumSummary,
	Field,
	FunctionSummary,
	ModuleSummary,
	StructSummary,
	Type,
	Variant,
} from './types/summary.js';

const ABILITY_FLAGS: Array<[number, Ability]> = [
	[0x1, 'Copy'],
	[0x2, 'Drop'],
	[0x4, 'Store'],
	[0x8, 'Key'],
];

function abilitiesFromBits(bits: number): Ability[] {
	return ABILITY_FLAGS.filter(([flag]) => (bits & flag) !== 0).map(([, ability]) => ability);
}

export function summaryFromDeserializedModule(mod: DeserializedModule) {
	const moduleHandle = mod.module_handles[mod.self_module_handle_idx];
	const summary: ModuleSummary = {
		id: {
			address: normalizeSuiAddress(mod.address_identifiers[moduleHandle.address]),
			name: mod.identifiers[moduleHandle.name],
		},
		immediate_dependencies: mod.module_handles.map((m) => ({
			address: normalizeSuiAddress(mod.address_identifiers[m.address]),
			name: mod.identifiers[m.name],
		})),
		functions: Object.fromEntries(
			Array.from({ length: mod.function_defs.length }, (_, i) =>
				functionSummaryFromDeserializedFunction(mod, i),
			),
		),
		structs: Object.fromEntries(
			Array.from({ length: mod.struct_defs.length }, (_, i) =>
				structSummaryFromDeserializedStruct(mod, i),
			),
		),
		enums: Object.fromEntries(
			Array.from({ length: mod.enum_defs.length }, (_, i) =>
				enumSummaryFromDeserializedEnum(mod, i),
			),
		),
	};

	return summary;
}

function functionSummaryFromDeserializedFunction(mod: DeserializedModule, index: number) {
	const def = mod.function_defs[index];
	const handle = mod.function_handles[def.function];
	const name = mod.identifiers[handle.name];

	const functionSummary: FunctionSummary = {
		index,
		visibility: def.visibility,
		entry: def.is_entry,
		type_parameters: handle.type_parameters.map((p) => {
			return {
				phantom: p.is_phantom,
				constraints: abilitiesFromBits(p.constraints),
			};
		}),
		parameters: mod.signatures[handle.parameters].map((type) => ({
			type_: typeFromTypeSignature(mod, type),
		})),
		return_: mod.signatures[handle.return_].map((type) => typeFromTypeSignature(mod, type)),
	};

	return [name, functionSummary];
}

function structSummaryFromDeserializedStruct(mod: DeserializedModule, index: number) {
	const def = mod.struct_defs[index];
	const handle = mod.datatype_handles[def.struct_handle];
	const name = mod.identifiers[handle.name];

	const structSummary: StructSummary = {
		index,
		abilities: abilitiesFromBits(handle.abilities),
		type_parameters: handle.type_parameters.map((p) => {
			return {
				phantom: p.is_phantom,
				constraints: abilitiesFromBits(p.constraints),
			};
		}),
		fields: {
			positional_fields: false,
			fields: Object.fromEntries(
				(def.field_information.Declared ?? []).map((field) =>
					fieldSummaryFromDeserializedField(mod, field),
				),
			),
		},
	};

	return [name, structSummary];
}

function enumSummaryFromDeserializedEnum(mod: DeserializedModule, index: number) {
	const def = mod.enum_defs[index];
	const handle = mod.datatype_handles[def.enum_handle];
	const name = mod.identifiers[handle.name];

	const enumSummary: EnumSummary = {
		index,
		abilities: abilitiesFromBits(handle.abilities),
		type_parameters: handle.type_parameters.map((p) => {
			return {
				phantom: p.is_phantom,
				constraints: abilitiesFromBits(p.constraints),
			};
		}),
		variants: Object.fromEntries(
			def.variants.map((variant) => variantSummaryFromDeserializedVariant(mod, variant)),
		),
	};

	return [name, enumSummary];
}

function variantSummaryFromDeserializedVariant(
	mod: DeserializedModule,
	variant: {
		variant_name: number;
		fields: Array<{
			name: number;
			signature: TypeSignature;
		}>;
	},
): [string, Variant] {
	return [
		mod.identifiers[variant.variant_name],
		{
			index: variant.variant_name,
			fields: {
				positional_fields: false,
				fields: Object.fromEntries(
					variant.fields.map((field) => fieldSummaryFromDeserializedField(mod, field)),
				),
			},
		},
	];
}

function fieldSummaryFromDeserializedField(
	mod: DeserializedModule,
	declared: {
		name: number;
		signature: TypeSignature;
	},
) {
	const name = mod.identifiers[declared.name];
	const type = typeFromTypeSignature(mod, declared.signature);

	const field: Field = {
		index: declared.name,
		type_: type,
	};

	return [name, field];
}

function typeFromTypeSignature(mod: DeserializedModule, type: TypeSignature): Type {
	switch (type) {
		case 'U8':
			return 'u8';
		case 'U16':
			return 'u16';
		case 'U32':
			return 'u32';
		case 'U64':
			return 'u64';
		case 'U128':
			return 'u128';
		case 'U256':
			return 'u256';
		case 'Address':
			return 'address';
		case 'Bool':
			return 'bool';
	}

	if ('Datatype' in type) {
		const handle = mod.datatype_handles[type.Datatype];
		const module = mod.module_handles[handle.module];
		return {
			Datatype: {
				module: {
					address: normalizeSuiAddress(mod.address_identifiers[module.address]),
					name: mod.identifiers[module.name],
				},
				name: mod.identifiers[handle.name],
				type_arguments: [],
			},
		};
	}

	if ('DatatypeInstantiation' in type) {
		const handle = mod.datatype_handles[type.DatatypeInstantiation[0]];
		const module = mod.module_handles[handle.module];
		return {
			Datatype: {
				module: {
					address: normalizeSuiAddress(mod.address_identifiers[module.address]),
					name: mod.identifiers[module.name],
				},
				name: mod.identifiers[handle.name],
				type_arguments: type.DatatypeInstantiation[1].map((t, i) => {
					return {
						phantom: handle.type_parameters[i].is_phantom,
						argument: typeFromTypeSignature(mod, t),
					};
				}),
			},
		};
	}

	if ('Vector' in type) {
		return {
			vector: typeFromTypeSignature(mod, type.Vector),
		};
	}

	if ('TypeParameter' in type) {
		return {
			TypeParameter: type.TypeParameter,
		};
	}

	if ('Reference' in type) {
		return {
			Reference: [false, typeFromTypeSignature(mod, type.Reference)],
		};
	}

	if ('MutableReference' in type) {
		return {
			Reference: [true, typeFromTypeSignature(mod, type.MutableReference)],
		};
	}

	throw new Error(`Unknown type: ${type}`);
}
