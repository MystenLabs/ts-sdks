// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { BinaryWriteOptions } from '@protobuf-ts/runtime';
import type { IBinaryWriter } from '@protobuf-ts/runtime';
import { WireType } from '@protobuf-ts/runtime';
import type { BinaryReadOptions } from '@protobuf-ts/runtime';
import type { IBinaryReader } from '@protobuf-ts/runtime';
import { UnknownFieldHandler } from '@protobuf-ts/runtime';
import type { PartialMessage } from '@protobuf-ts/runtime';
import { reflectionMergePartial } from '@protobuf-ts/runtime';
import { MessageType } from '@protobuf-ts/runtime';
/**
 * A Move Package
 *
 * @generated from protobuf message sui.rpc.v2beta2.Package
 */
export interface Package {
	/**
	 * The PackageId of this package
	 *
	 * A package's `storage_id` is the Sui ObjectId of the package on-chain.
	 * Outside of system packages the `storage_id` for every package version is
	 * different.
	 *
	 * @generated from protobuf field: optional string storage_id = 1;
	 */
	storageId?: string;
	/**
	 * The PackageId of the first published version of this package.
	 *
	 * A package's `original_id` (sometimes also called its `runtime_id`) is the
	 * `storage_id` of the first version of this package that has been published.
	 * The `original_id`/`runtime_id` is stable across all versions of the
	 * package and does not ever change.
	 *
	 * @generated from protobuf field: optional string original_id = 2;
	 */
	originalId?: string;
	/**
	 * The version of this package
	 *
	 * @generated from protobuf field: optional uint64 version = 3;
	 */
	version?: bigint;
	/**
	 * The modules defined by this package
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Module modules = 4;
	 */
	modules: Module[];
	/**
	 * List of datatype origins for mapping datatypes to a package version where
	 * it was first defined
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.TypeOrigin type_origins = 5;
	 */
	typeOrigins: TypeOrigin[];
	/**
	 * The package's transitive dependencies as a mapping from the package's
	 * runtime Id (the Id it is referred to by in other packages) to its
	 * storage Id (the Id it is loaded from on chain).
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Linkage linkage = 6;
	 */
	linkage: Linkage[];
}
/**
 * A Move Module.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Module
 */
export interface Module {
	/**
	 * Name of this module.
	 *
	 * @generated from protobuf field: optional string name = 1;
	 */
	name?: string;
	/**
	 * Serialized bytecode of the module.
	 *
	 * @generated from protobuf field: optional bytes contents = 2;
	 */
	contents?: Uint8Array;
	/**
	 * List of DataTypes defined by this module.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.DatatypeDescriptor datatypes = 3;
	 */
	datatypes: DatatypeDescriptor[];
	/**
	 * List of Functions defined by this module.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.FunctionDescriptor functions = 4;
	 */
	functions: FunctionDescriptor[];
}
/**
 * Describes a Move Datatype.
 *
 * @generated from protobuf message sui.rpc.v2beta2.DatatypeDescriptor
 */
export interface DatatypeDescriptor {
	/**
	 * Fully qualified name of this Datatype.
	 *
	 * This is `<defining_id>::<module>::<name>`
	 *
	 * @generated from protobuf field: optional string type_name = 1;
	 */
	typeName?: string;
	/**
	 * PackageId of the package where this Datatype is defined.
	 *
	 * A type's `defining_id` is the `storage_id` of the package version that first introduced or added that type.
	 *
	 * @generated from protobuf field: optional string defining_id = 2;
	 */
	definingId?: string;
	/**
	 * Name of the module where this Datatype is defined
	 *
	 * @generated from protobuf field: optional string module = 3;
	 */
	module?: string;
	/**
	 * Name of this Datatype
	 *
	 * @generated from protobuf field: optional string name = 4;
	 */
	name?: string;
	/**
	 * This type's abilities
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Ability abilities = 5;
	 */
	abilities: Ability[];
	/**
	 * Ability constraints and phantom status for this type's generic type parameters
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.TypeParameter type_parameters = 6;
	 */
	typeParameters: TypeParameter[];
	/**
	 * Indicates whether this datatype is a 'STRUCT' or an 'ENUM'
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.DatatypeDescriptor.DatatypeKind kind = 7;
	 */
	kind?: DatatypeDescriptor_DatatypeKind;
	/**
	 * Set of fields if this Datatype is a struct.
	 *
	 * The order of the entries is the order of how the fields are defined.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.FieldDescriptor fields = 8;
	 */
	fields: FieldDescriptor[];
	/**
	 * Set of variants if this Datatype is an enum.
	 *
	 * The order of the entries is the order of how the variants are defined.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.VariantDescriptor variants = 9;
	 */
	variants: VariantDescriptor[];
}
/**
 * @generated from protobuf enum sui.rpc.v2beta2.DatatypeDescriptor.DatatypeKind
 */
export enum DatatypeDescriptor_DatatypeKind {
	/**
	 * @generated from protobuf enum value: DATATYPE_KIND_UNKNOWN = 0;
	 */
	DATATYPE_KIND_UNKNOWN = 0,
	/**
	 * @generated from protobuf enum value: STRUCT = 1;
	 */
	STRUCT = 1,
	/**
	 * @generated from protobuf enum value: ENUM = 2;
	 */
	ENUM = 2,
}
/**
 * A generic type parameter used in the declaration of a struct or enum.
 *
 * @generated from protobuf message sui.rpc.v2beta2.TypeParameter
 */
export interface TypeParameter {
	/**
	 * The type parameter constraints
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Ability constraints = 1;
	 */
	constraints: Ability[];
	/**
	 * Whether the parameter is declared as phantom
	 *
	 * @generated from protobuf field: optional bool is_phantom = 2;
	 */
	isPhantom?: boolean;
}
/**
 * Descriptor of a field that belongs to a struct or enum variant
 *
 * @generated from protobuf message sui.rpc.v2beta2.FieldDescriptor
 */
export interface FieldDescriptor {
	/**
	 * Name of the field
	 *
	 * @generated from protobuf field: optional string name = 1;
	 */
	name?: string;
	/**
	 * Order or position of the field in the struct or enum variant definition.
	 *
	 * @generated from protobuf field: optional uint32 position = 2;
	 */
	position?: number;
	/**
	 * The type of the field
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.OpenSignatureBody type = 3;
	 */
	type?: OpenSignatureBody;
}
/**
 * Descriptor of an enum variant
 *
 * @generated from protobuf message sui.rpc.v2beta2.VariantDescriptor
 */
export interface VariantDescriptor {
	/**
	 * Name of the variant
	 *
	 * @generated from protobuf field: optional string name = 1;
	 */
	name?: string;
	/**
	 * Order or position of the variant in the enum definition.
	 *
	 * @generated from protobuf field: optional uint32 position = 2;
	 */
	position?: number;
	/**
	 * Set of fields defined by this variant.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.FieldDescriptor fields = 3;
	 */
	fields: FieldDescriptor[];
}
/**
 * Representation of a type signature that could appear as a field type for a struct or enum
 *
 * @generated from protobuf message sui.rpc.v2beta2.OpenSignatureBody
 */
export interface OpenSignatureBody {
	/**
	 * Type of this signature
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.OpenSignatureBody.Type type = 1;
	 */
	type?: OpenSignatureBody_Type;
	/**
	 * Fully qualified name of the datatype when `type` is `DATATYPE`
	 *
	 * @generated from protobuf field: optional string type_name = 2;
	 */
	typeName?: string;
	/**
	 * Set when `type` is `VECTOR` or `DATATYPE`
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.OpenSignatureBody type_parameter_instantiation = 3;
	 */
	typeParameterInstantiation: OpenSignatureBody[];
	/**
	 * Position of the type parameter as defined in the containing data type descriptor when `type` is `TYPE_PARAMETER`
	 *
	 * @generated from protobuf field: optional uint32 type_parameter = 4;
	 */
	typeParameter?: number;
}
/**
 * @generated from protobuf enum sui.rpc.v2beta2.OpenSignatureBody.Type
 */
export enum OpenSignatureBody_Type {
	/**
	 * @generated from protobuf enum value: TYPE_UNKNOWN = 0;
	 */
	TYPE_UNKNOWN = 0,
	/**
	 * @generated from protobuf enum value: ADDRESS = 1;
	 */
	ADDRESS = 1,
	/**
	 * @generated from protobuf enum value: BOOL = 2;
	 */
	BOOL = 2,
	/**
	 * @generated from protobuf enum value: U8 = 3;
	 */
	U8 = 3,
	/**
	 * @generated from protobuf enum value: U16 = 4;
	 */
	U16 = 4,
	/**
	 * @generated from protobuf enum value: U32 = 5;
	 */
	U32 = 5,
	/**
	 * @generated from protobuf enum value: U64 = 6;
	 */
	U64 = 6,
	/**
	 * @generated from protobuf enum value: U128 = 7;
	 */
	U128 = 7,
	/**
	 * @generated from protobuf enum value: U256 = 8;
	 */
	U256 = 8,
	/**
	 * @generated from protobuf enum value: VECTOR = 9;
	 */
	VECTOR = 9,
	/**
	 * @generated from protobuf enum value: DATATYPE = 10;
	 */
	DATATYPE = 10,
	/**
	 * @generated from protobuf enum value: TYPE_PARAMETER = 11;
	 */
	TYPE_PARAMETER = 11,
}
/**
 * Descriptor of a Move function
 *
 * @generated from protobuf message sui.rpc.v2beta2.FunctionDescriptor
 */
export interface FunctionDescriptor {
	/**
	 * Name of the function
	 *
	 * @generated from protobuf field: optional string name = 1;
	 */
	name?: string;
	/**
	 * Whether the function is `public`, `private` or `public(friend)`
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.FunctionDescriptor.Visibility visibility = 5;
	 */
	visibility?: FunctionDescriptor_Visibility;
	/**
	 * Whether the function is marked `entry` or not.
	 *
	 * @generated from protobuf field: optional bool is_entry = 6;
	 */
	isEntry?: boolean;
	/**
	 * Ability constraints for type parameters
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.TypeParameter type_parameters = 7;
	 */
	typeParameters: TypeParameter[];
	/**
	 * Formal parameter types.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.OpenSignature parameters = 8;
	 */
	parameters: OpenSignature[];
	/**
	 * Return types.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.OpenSignature returns = 9;
	 */
	returns: OpenSignature[];
}
/**
 * @generated from protobuf enum sui.rpc.v2beta2.FunctionDescriptor.Visibility
 */
export enum FunctionDescriptor_Visibility {
	/**
	 * @generated from protobuf enum value: VISIBILITY_UNKNOWN = 0;
	 */
	VISIBILITY_UNKNOWN = 0,
	/**
	 * @generated from protobuf enum value: PRIVATE = 1;
	 */
	PRIVATE = 1,
	/**
	 * @generated from protobuf enum value: PUBLIC = 2;
	 */
	PUBLIC = 2,
	/**
	 * @generated from protobuf enum value: FRIEND = 3;
	 */
	FRIEND = 3,
}
/**
 * Representation of a type signature that could appear as a function parameter or return value.
 *
 * @generated from protobuf message sui.rpc.v2beta2.OpenSignature
 */
export interface OpenSignature {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.OpenSignature.Reference reference = 1;
	 */
	reference?: OpenSignature_Reference;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.OpenSignatureBody body = 2;
	 */
	body?: OpenSignatureBody;
}
/**
 * @generated from protobuf enum sui.rpc.v2beta2.OpenSignature.Reference
 */
export enum OpenSignature_Reference {
	/**
	 * @generated from protobuf enum value: REFERENCE_UNKNOWN = 0;
	 */
	REFERENCE_UNKNOWN = 0,
	/**
	 * @generated from protobuf enum value: IMMUTABLE = 1;
	 */
	IMMUTABLE = 1,
	/**
	 * @generated from protobuf enum value: MUTABLE = 2;
	 */
	MUTABLE = 2,
}
/**
 * Identifies a struct and the module it was defined in.
 *
 * @generated from protobuf message sui.rpc.v2beta2.TypeOrigin
 */
export interface TypeOrigin {
	/**
	 * @generated from protobuf field: optional string module_name = 1;
	 */
	moduleName?: string;
	/**
	 * @generated from protobuf field: optional string datatype_name = 2;
	 */
	datatypeName?: string;
	/**
	 * @generated from protobuf field: optional string package_id = 3;
	 */
	packageId?: string;
}
/**
 * Upgraded package info for the linkage table.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Linkage
 */
export interface Linkage {
	/**
	 * Id of the original package.
	 *
	 * @generated from protobuf field: optional string original_id = 1;
	 */
	originalId?: string;
	/**
	 * Id of the upgraded package.
	 *
	 * @generated from protobuf field: optional string upgraded_id = 2;
	 */
	upgradedId?: string;
	/**
	 * Version of the upgraded package.
	 *
	 * @generated from protobuf field: optional uint64 upgraded_version = 3;
	 */
	upgradedVersion?: bigint;
}
/**
 * An `Ability` classifies what operations are permitted for a given type
 *
 * @generated from protobuf enum sui.rpc.v2beta2.Ability
 */
export enum Ability {
	/**
	 * @generated from protobuf enum value: ABILITY_UNKNOWN = 0;
	 */
	ABILITY_UNKNOWN = 0,
	/**
	 * Allows values of types with this ability to be copied
	 *
	 * @generated from protobuf enum value: COPY = 1;
	 */
	COPY = 1,
	/**
	 * Allows values of types with this ability to be dropped.
	 *
	 * @generated from protobuf enum value: DROP = 2;
	 */
	DROP = 2,
	/**
	 * Allows values of types with this ability to exist inside a struct in global storage
	 *
	 * @generated from protobuf enum value: STORE = 3;
	 */
	STORE = 3,
	/**
	 * Allows the type to serve as a key for global storage operations
	 *
	 * @generated from protobuf enum value: KEY = 4;
	 */
	KEY = 4,
}
// @generated message type with reflection information, may provide speed optimized methods
class Package$Type extends MessageType<Package> {
	constructor() {
		super('sui.rpc.v2beta2.Package', [
			{ no: 1, name: 'storage_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'original_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 3,
				name: 'version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 4, name: 'modules', kind: 'message', repeat: 1 /*RepeatType.PACKED*/, T: () => Module },
			{
				no: 5,
				name: 'type_origins',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => TypeOrigin,
			},
			{
				no: 6,
				name: 'linkage',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => Linkage,
			},
		]);
	}
	create(value?: PartialMessage<Package>): Package {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.modules = [];
		message.typeOrigins = [];
		message.linkage = [];
		if (value !== undefined) reflectionMergePartial<Package>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Package,
	): Package {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string storage_id */ 1:
					message.storageId = reader.string();
					break;
				case /* optional string original_id */ 2:
					message.originalId = reader.string();
					break;
				case /* optional uint64 version */ 3:
					message.version = reader.uint64().toBigInt();
					break;
				case /* repeated sui.rpc.v2beta2.Module modules */ 4:
					message.modules.push(Module.internalBinaryRead(reader, reader.uint32(), options));
					break;
				case /* repeated sui.rpc.v2beta2.TypeOrigin type_origins */ 5:
					message.typeOrigins.push(TypeOrigin.internalBinaryRead(reader, reader.uint32(), options));
					break;
				case /* repeated sui.rpc.v2beta2.Linkage linkage */ 6:
					message.linkage.push(Linkage.internalBinaryRead(reader, reader.uint32(), options));
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: Package,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string storage_id = 1; */
		if (message.storageId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.storageId);
		/* optional string original_id = 2; */
		if (message.originalId !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.originalId);
		/* optional uint64 version = 3; */
		if (message.version !== undefined) writer.tag(3, WireType.Varint).uint64(message.version);
		/* repeated sui.rpc.v2beta2.Module modules = 4; */
		for (let i = 0; i < message.modules.length; i++)
			Module.internalBinaryWrite(
				message.modules[i],
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.TypeOrigin type_origins = 5; */
		for (let i = 0; i < message.typeOrigins.length; i++)
			TypeOrigin.internalBinaryWrite(
				message.typeOrigins[i],
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.Linkage linkage = 6; */
		for (let i = 0; i < message.linkage.length; i++)
			Linkage.internalBinaryWrite(
				message.linkage[i],
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Package
 */
export const Package = new Package$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Module$Type extends MessageType<Module> {
	constructor() {
		super('sui.rpc.v2beta2.Module', [
			{ no: 1, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'contents', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{
				no: 3,
				name: 'datatypes',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => DatatypeDescriptor,
			},
			{
				no: 4,
				name: 'functions',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => FunctionDescriptor,
			},
		]);
	}
	create(value?: PartialMessage<Module>): Module {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.datatypes = [];
		message.functions = [];
		if (value !== undefined) reflectionMergePartial<Module>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Module,
	): Module {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string name */ 1:
					message.name = reader.string();
					break;
				case /* optional bytes contents */ 2:
					message.contents = reader.bytes();
					break;
				case /* repeated sui.rpc.v2beta2.DatatypeDescriptor datatypes */ 3:
					message.datatypes.push(
						DatatypeDescriptor.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* repeated sui.rpc.v2beta2.FunctionDescriptor functions */ 4:
					message.functions.push(
						FunctionDescriptor.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: Module,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string name = 1; */
		if (message.name !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.name);
		/* optional bytes contents = 2; */
		if (message.contents !== undefined)
			writer.tag(2, WireType.LengthDelimited).bytes(message.contents);
		/* repeated sui.rpc.v2beta2.DatatypeDescriptor datatypes = 3; */
		for (let i = 0; i < message.datatypes.length; i++)
			DatatypeDescriptor.internalBinaryWrite(
				message.datatypes[i],
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.FunctionDescriptor functions = 4; */
		for (let i = 0; i < message.functions.length; i++)
			FunctionDescriptor.internalBinaryWrite(
				message.functions[i],
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Module
 */
export const Module = new Module$Type();
// @generated message type with reflection information, may provide speed optimized methods
class DatatypeDescriptor$Type extends MessageType<DatatypeDescriptor> {
	constructor() {
		super('sui.rpc.v2beta2.DatatypeDescriptor', [
			{ no: 1, name: 'type_name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'defining_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'module', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 5,
				name: 'abilities',
				kind: 'enum',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => ['sui.rpc.v2beta2.Ability', Ability],
			},
			{
				no: 6,
				name: 'type_parameters',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => TypeParameter,
			},
			{
				no: 7,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => [
					'sui.rpc.v2beta2.DatatypeDescriptor.DatatypeKind',
					DatatypeDescriptor_DatatypeKind,
				],
			},
			{
				no: 8,
				name: 'fields',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => FieldDescriptor,
			},
			{
				no: 9,
				name: 'variants',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => VariantDescriptor,
			},
		]);
	}
	create(value?: PartialMessage<DatatypeDescriptor>): DatatypeDescriptor {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.abilities = [];
		message.typeParameters = [];
		message.fields = [];
		message.variants = [];
		if (value !== undefined) reflectionMergePartial<DatatypeDescriptor>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: DatatypeDescriptor,
	): DatatypeDescriptor {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string type_name */ 1:
					message.typeName = reader.string();
					break;
				case /* optional string defining_id */ 2:
					message.definingId = reader.string();
					break;
				case /* optional string module */ 3:
					message.module = reader.string();
					break;
				case /* optional string name */ 4:
					message.name = reader.string();
					break;
				case /* repeated sui.rpc.v2beta2.Ability abilities */ 5:
					if (wireType === WireType.LengthDelimited)
						for (let e = reader.int32() + reader.pos; reader.pos < e; )
							message.abilities.push(reader.int32());
					else message.abilities.push(reader.int32());
					break;
				case /* repeated sui.rpc.v2beta2.TypeParameter type_parameters */ 6:
					message.typeParameters.push(
						TypeParameter.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional sui.rpc.v2beta2.DatatypeDescriptor.DatatypeKind kind */ 7:
					message.kind = reader.int32();
					break;
				case /* repeated sui.rpc.v2beta2.FieldDescriptor fields */ 8:
					message.fields.push(FieldDescriptor.internalBinaryRead(reader, reader.uint32(), options));
					break;
				case /* repeated sui.rpc.v2beta2.VariantDescriptor variants */ 9:
					message.variants.push(
						VariantDescriptor.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: DatatypeDescriptor,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string type_name = 1; */
		if (message.typeName !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.typeName);
		/* optional string defining_id = 2; */
		if (message.definingId !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.definingId);
		/* optional string module = 3; */
		if (message.module !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.module);
		/* optional string name = 4; */
		if (message.name !== undefined) writer.tag(4, WireType.LengthDelimited).string(message.name);
		/* repeated sui.rpc.v2beta2.Ability abilities = 5; */
		if (message.abilities.length) {
			writer.tag(5, WireType.LengthDelimited).fork();
			for (let i = 0; i < message.abilities.length; i++) writer.int32(message.abilities[i]);
			writer.join();
		}
		/* repeated sui.rpc.v2beta2.TypeParameter type_parameters = 6; */
		for (let i = 0; i < message.typeParameters.length; i++)
			TypeParameter.internalBinaryWrite(
				message.typeParameters[i],
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.DatatypeDescriptor.DatatypeKind kind = 7; */
		if (message.kind !== undefined) writer.tag(7, WireType.Varint).int32(message.kind);
		/* repeated sui.rpc.v2beta2.FieldDescriptor fields = 8; */
		for (let i = 0; i < message.fields.length; i++)
			FieldDescriptor.internalBinaryWrite(
				message.fields[i],
				writer.tag(8, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.VariantDescriptor variants = 9; */
		for (let i = 0; i < message.variants.length; i++)
			VariantDescriptor.internalBinaryWrite(
				message.variants[i],
				writer.tag(9, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.DatatypeDescriptor
 */
export const DatatypeDescriptor = new DatatypeDescriptor$Type();
// @generated message type with reflection information, may provide speed optimized methods
class TypeParameter$Type extends MessageType<TypeParameter> {
	constructor() {
		super('sui.rpc.v2beta2.TypeParameter', [
			{
				no: 1,
				name: 'constraints',
				kind: 'enum',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => ['sui.rpc.v2beta2.Ability', Ability],
			},
			{ no: 2, name: 'is_phantom', kind: 'scalar', opt: true, T: 8 /*ScalarType.BOOL*/ },
		]);
	}
	create(value?: PartialMessage<TypeParameter>): TypeParameter {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.constraints = [];
		if (value !== undefined) reflectionMergePartial<TypeParameter>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: TypeParameter,
	): TypeParameter {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta2.Ability constraints */ 1:
					if (wireType === WireType.LengthDelimited)
						for (let e = reader.int32() + reader.pos; reader.pos < e; )
							message.constraints.push(reader.int32());
					else message.constraints.push(reader.int32());
					break;
				case /* optional bool is_phantom */ 2:
					message.isPhantom = reader.bool();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: TypeParameter,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta2.Ability constraints = 1; */
		if (message.constraints.length) {
			writer.tag(1, WireType.LengthDelimited).fork();
			for (let i = 0; i < message.constraints.length; i++) writer.int32(message.constraints[i]);
			writer.join();
		}
		/* optional bool is_phantom = 2; */
		if (message.isPhantom !== undefined) writer.tag(2, WireType.Varint).bool(message.isPhantom);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.TypeParameter
 */
export const TypeParameter = new TypeParameter$Type();
// @generated message type with reflection information, may provide speed optimized methods
class FieldDescriptor$Type extends MessageType<FieldDescriptor> {
	constructor() {
		super('sui.rpc.v2beta2.FieldDescriptor', [
			{ no: 1, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'position', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 3, name: 'type', kind: 'message', T: () => OpenSignatureBody },
		]);
	}
	create(value?: PartialMessage<FieldDescriptor>): FieldDescriptor {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<FieldDescriptor>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: FieldDescriptor,
	): FieldDescriptor {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string name */ 1:
					message.name = reader.string();
					break;
				case /* optional uint32 position */ 2:
					message.position = reader.uint32();
					break;
				case /* optional sui.rpc.v2beta2.OpenSignatureBody type */ 3:
					message.type = OpenSignatureBody.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.type,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: FieldDescriptor,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string name = 1; */
		if (message.name !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.name);
		/* optional uint32 position = 2; */
		if (message.position !== undefined) writer.tag(2, WireType.Varint).uint32(message.position);
		/* optional sui.rpc.v2beta2.OpenSignatureBody type = 3; */
		if (message.type)
			OpenSignatureBody.internalBinaryWrite(
				message.type,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.FieldDescriptor
 */
export const FieldDescriptor = new FieldDescriptor$Type();
// @generated message type with reflection information, may provide speed optimized methods
class VariantDescriptor$Type extends MessageType<VariantDescriptor> {
	constructor() {
		super('sui.rpc.v2beta2.VariantDescriptor', [
			{ no: 1, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'position', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{
				no: 3,
				name: 'fields',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => FieldDescriptor,
			},
		]);
	}
	create(value?: PartialMessage<VariantDescriptor>): VariantDescriptor {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.fields = [];
		if (value !== undefined) reflectionMergePartial<VariantDescriptor>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: VariantDescriptor,
	): VariantDescriptor {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string name */ 1:
					message.name = reader.string();
					break;
				case /* optional uint32 position */ 2:
					message.position = reader.uint32();
					break;
				case /* repeated sui.rpc.v2beta2.FieldDescriptor fields */ 3:
					message.fields.push(FieldDescriptor.internalBinaryRead(reader, reader.uint32(), options));
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: VariantDescriptor,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string name = 1; */
		if (message.name !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.name);
		/* optional uint32 position = 2; */
		if (message.position !== undefined) writer.tag(2, WireType.Varint).uint32(message.position);
		/* repeated sui.rpc.v2beta2.FieldDescriptor fields = 3; */
		for (let i = 0; i < message.fields.length; i++)
			FieldDescriptor.internalBinaryWrite(
				message.fields[i],
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.VariantDescriptor
 */
export const VariantDescriptor = new VariantDescriptor$Type();
// @generated message type with reflection information, may provide speed optimized methods
class OpenSignatureBody$Type extends MessageType<OpenSignatureBody> {
	constructor() {
		super('sui.rpc.v2beta2.OpenSignatureBody', [
			{
				no: 1,
				name: 'type',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta2.OpenSignatureBody.Type', OpenSignatureBody_Type],
			},
			{ no: 2, name: 'type_name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 3,
				name: 'type_parameter_instantiation',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => OpenSignatureBody,
			},
			{ no: 4, name: 'type_parameter', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
		]);
	}
	create(value?: PartialMessage<OpenSignatureBody>): OpenSignatureBody {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.typeParameterInstantiation = [];
		if (value !== undefined) reflectionMergePartial<OpenSignatureBody>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: OpenSignatureBody,
	): OpenSignatureBody {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.OpenSignatureBody.Type type */ 1:
					message.type = reader.int32();
					break;
				case /* optional string type_name */ 2:
					message.typeName = reader.string();
					break;
				case /* repeated sui.rpc.v2beta2.OpenSignatureBody type_parameter_instantiation */ 3:
					message.typeParameterInstantiation.push(
						OpenSignatureBody.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional uint32 type_parameter */ 4:
					message.typeParameter = reader.uint32();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: OpenSignatureBody,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.OpenSignatureBody.Type type = 1; */
		if (message.type !== undefined) writer.tag(1, WireType.Varint).int32(message.type);
		/* optional string type_name = 2; */
		if (message.typeName !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.typeName);
		/* repeated sui.rpc.v2beta2.OpenSignatureBody type_parameter_instantiation = 3; */
		for (let i = 0; i < message.typeParameterInstantiation.length; i++)
			OpenSignatureBody.internalBinaryWrite(
				message.typeParameterInstantiation[i],
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint32 type_parameter = 4; */
		if (message.typeParameter !== undefined)
			writer.tag(4, WireType.Varint).uint32(message.typeParameter);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.OpenSignatureBody
 */
export const OpenSignatureBody = new OpenSignatureBody$Type();
// @generated message type with reflection information, may provide speed optimized methods
class FunctionDescriptor$Type extends MessageType<FunctionDescriptor> {
	constructor() {
		super('sui.rpc.v2beta2.FunctionDescriptor', [
			{ no: 1, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 5,
				name: 'visibility',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta2.FunctionDescriptor.Visibility', FunctionDescriptor_Visibility],
			},
			{ no: 6, name: 'is_entry', kind: 'scalar', opt: true, T: 8 /*ScalarType.BOOL*/ },
			{
				no: 7,
				name: 'type_parameters',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => TypeParameter,
			},
			{
				no: 8,
				name: 'parameters',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => OpenSignature,
			},
			{
				no: 9,
				name: 'returns',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => OpenSignature,
			},
		]);
	}
	create(value?: PartialMessage<FunctionDescriptor>): FunctionDescriptor {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.typeParameters = [];
		message.parameters = [];
		message.returns = [];
		if (value !== undefined) reflectionMergePartial<FunctionDescriptor>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: FunctionDescriptor,
	): FunctionDescriptor {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string name */ 1:
					message.name = reader.string();
					break;
				case /* optional sui.rpc.v2beta2.FunctionDescriptor.Visibility visibility */ 5:
					message.visibility = reader.int32();
					break;
				case /* optional bool is_entry */ 6:
					message.isEntry = reader.bool();
					break;
				case /* repeated sui.rpc.v2beta2.TypeParameter type_parameters */ 7:
					message.typeParameters.push(
						TypeParameter.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* repeated sui.rpc.v2beta2.OpenSignature parameters */ 8:
					message.parameters.push(
						OpenSignature.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* repeated sui.rpc.v2beta2.OpenSignature returns */ 9:
					message.returns.push(OpenSignature.internalBinaryRead(reader, reader.uint32(), options));
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: FunctionDescriptor,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string name = 1; */
		if (message.name !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.name);
		/* optional sui.rpc.v2beta2.FunctionDescriptor.Visibility visibility = 5; */
		if (message.visibility !== undefined) writer.tag(5, WireType.Varint).int32(message.visibility);
		/* optional bool is_entry = 6; */
		if (message.isEntry !== undefined) writer.tag(6, WireType.Varint).bool(message.isEntry);
		/* repeated sui.rpc.v2beta2.TypeParameter type_parameters = 7; */
		for (let i = 0; i < message.typeParameters.length; i++)
			TypeParameter.internalBinaryWrite(
				message.typeParameters[i],
				writer.tag(7, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.OpenSignature parameters = 8; */
		for (let i = 0; i < message.parameters.length; i++)
			OpenSignature.internalBinaryWrite(
				message.parameters[i],
				writer.tag(8, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.OpenSignature returns = 9; */
		for (let i = 0; i < message.returns.length; i++)
			OpenSignature.internalBinaryWrite(
				message.returns[i],
				writer.tag(9, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.FunctionDescriptor
 */
export const FunctionDescriptor = new FunctionDescriptor$Type();
// @generated message type with reflection information, may provide speed optimized methods
class OpenSignature$Type extends MessageType<OpenSignature> {
	constructor() {
		super('sui.rpc.v2beta2.OpenSignature', [
			{
				no: 1,
				name: 'reference',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta2.OpenSignature.Reference', OpenSignature_Reference],
			},
			{ no: 2, name: 'body', kind: 'message', T: () => OpenSignatureBody },
		]);
	}
	create(value?: PartialMessage<OpenSignature>): OpenSignature {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<OpenSignature>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: OpenSignature,
	): OpenSignature {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.OpenSignature.Reference reference */ 1:
					message.reference = reader.int32();
					break;
				case /* optional sui.rpc.v2beta2.OpenSignatureBody body */ 2:
					message.body = OpenSignatureBody.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.body,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: OpenSignature,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.OpenSignature.Reference reference = 1; */
		if (message.reference !== undefined) writer.tag(1, WireType.Varint).int32(message.reference);
		/* optional sui.rpc.v2beta2.OpenSignatureBody body = 2; */
		if (message.body)
			OpenSignatureBody.internalBinaryWrite(
				message.body,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.OpenSignature
 */
export const OpenSignature = new OpenSignature$Type();
// @generated message type with reflection information, may provide speed optimized methods
class TypeOrigin$Type extends MessageType<TypeOrigin> {
	constructor() {
		super('sui.rpc.v2beta2.TypeOrigin', [
			{ no: 1, name: 'module_name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'datatype_name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'package_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<TypeOrigin>): TypeOrigin {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<TypeOrigin>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: TypeOrigin,
	): TypeOrigin {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string module_name */ 1:
					message.moduleName = reader.string();
					break;
				case /* optional string datatype_name */ 2:
					message.datatypeName = reader.string();
					break;
				case /* optional string package_id */ 3:
					message.packageId = reader.string();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: TypeOrigin,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string module_name = 1; */
		if (message.moduleName !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.moduleName);
		/* optional string datatype_name = 2; */
		if (message.datatypeName !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.datatypeName);
		/* optional string package_id = 3; */
		if (message.packageId !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.packageId);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.TypeOrigin
 */
export const TypeOrigin = new TypeOrigin$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Linkage$Type extends MessageType<Linkage> {
	constructor() {
		super('sui.rpc.v2beta2.Linkage', [
			{ no: 1, name: 'original_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'upgraded_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 3,
				name: 'upgraded_version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<Linkage>): Linkage {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<Linkage>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Linkage,
	): Linkage {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string original_id */ 1:
					message.originalId = reader.string();
					break;
				case /* optional string upgraded_id */ 2:
					message.upgradedId = reader.string();
					break;
				case /* optional uint64 upgraded_version */ 3:
					message.upgradedVersion = reader.uint64().toBigInt();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: Linkage,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string original_id = 1; */
		if (message.originalId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.originalId);
		/* optional string upgraded_id = 2; */
		if (message.upgradedId !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.upgradedId);
		/* optional uint64 upgraded_version = 3; */
		if (message.upgradedVersion !== undefined)
			writer.tag(3, WireType.Varint).uint64(message.upgradedVersion);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Linkage
 */
export const Linkage = new Linkage$Type();
