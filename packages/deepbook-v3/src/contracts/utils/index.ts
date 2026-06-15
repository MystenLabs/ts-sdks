import {
	bcs,
	type BcsType,
	type TypeTag,
	TypeTagSerializer,
	BcsStruct,
	BcsEnum,
	BcsTuple,
} from '@mysten/sui/bcs';
import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui/utils';
import { type TransactionArgument, isArgument } from '@mysten/sui/transactions';
import { type ClientWithCoreApi, type SuiClientTypes } from '@mysten/sui/client';

const MOVE_STDLIB_ADDRESS = normalizeSuiAddress('0x1');
const SUI_FRAMEWORK_ADDRESS = normalizeSuiAddress('0x2');

export type RawTransactionArgument<T> = T | TransactionArgument;

export type GetOptions<Include extends Omit<SuiClientTypes.ObjectInclude, 'content'> = {}> =
	SuiClientTypes.GetObjectOptions<Include> & { client: ClientWithCoreApi };

export type GetManyOptions<Include extends Omit<SuiClientTypes.ObjectInclude, 'content'> = {}> =
	SuiClientTypes.GetObjectsOptions<Include> & { client: ClientWithCoreApi };

export function getPureBcsSchema(typeTag: string | TypeTag): BcsType<any> | null {
	const parsedTag = typeof typeTag === 'string' ? TypeTagSerializer.parseFromStr(typeTag) : typeTag;

	if ('u8' in parsedTag) {
		return bcs.U8;
	} else if ('u16' in parsedTag) {
		return bcs.U16;
	} else if ('u32' in parsedTag) {
		return bcs.U32;
	} else if ('u64' in parsedTag) {
		return bcs.U64;
	} else if ('u128' in parsedTag) {
		return bcs.U128;
	} else if ('u256' in parsedTag) {
		return bcs.U256;
	} else if ('address' in parsedTag) {
		return bcs.Address;
	} else if ('bool' in parsedTag) {
		return bcs.Bool;
	} else if ('vector' in parsedTag) {
		const type = getPureBcsSchema(parsedTag.vector);
		return type ? bcs.vector(type) : null;
	} else if ('struct' in parsedTag) {
		const structTag = parsedTag.struct;
		const pkg = normalizeSuiAddress(structTag.address);

		if (pkg === MOVE_STDLIB_ADDRESS) {
			if (
				(structTag.module === 'ascii' || structTag.module === 'string') &&
				structTag.name === 'String'
			) {
				return bcs.String;
			}

			if (structTag.module === 'option' && structTag.name === 'Option') {
				const inner = structTag.typeParams[0];
				const type = inner ? getPureBcsSchema(inner) : null;
				return type ? bcs.option(type) : null;
			}
		}

		if (
			pkg === SUI_FRAMEWORK_ADDRESS &&
			structTag.module === 'object' &&
			(structTag.name === 'ID' || structTag.name === 'UID')
		) {
			return bcs.Address;
		}
	}

	return null;
}

export function normalizeMoveArguments(
	args: unknown[] | object,
	argTypes: readonly (string | null)[],
	parameterNames?: string[],
) {
	const argLen = Array.isArray(args) ? args.length : Object.keys(args).length;
	if (parameterNames && argLen !== parameterNames.length) {
		throw new Error(
			`Invalid number of arguments, expected ${parameterNames.length}, got ${argLen}`,
		);
	}

	const normalizedArgs: TransactionArgument[] = [];

	let index = 0;
	for (const argType of argTypes) {
		if (argType === '0x2::clock::Clock') {
			normalizedArgs.push((tx) => tx.object.clock());
			continue;
		}

		if (argType === '0x2::random::Random') {
			normalizedArgs.push((tx) => tx.object.random());
			continue;
		}

		if (argType === '0x2::deny_list::DenyList') {
			normalizedArgs.push((tx) => tx.object.denyList());
			continue;
		}

		if (argType === '0x3::sui_system::SuiSystemState') {
			normalizedArgs.push((tx) => tx.object.system());
			continue;
		}

		let arg;
		if (Array.isArray(args)) {
			if (index >= args.length) {
				throw new Error(
					`Invalid number of arguments, expected at least ${index + 1}, got ${args.length}`,
				);
			}
			arg = args[index];
		} else {
			if (!parameterNames) {
				throw new Error(`Expected arguments to be passed as an array`);
			}
			const name = parameterNames[index];
			arg = args[name as keyof typeof args];

			if (arg === undefined) {
				throw new Error(`Parameter ${name} is required`);
			}
		}

		index += 1;

		if (typeof arg === 'function' || isArgument(arg)) {
			normalizedArgs.push(arg as TransactionArgument);
			continue;
		}

		const bcsType = argType === null ? null : getPureBcsSchema(argType);

		if (bcsType) {
			const bytes = bcsType.serialize(arg as never);
			normalizedArgs.push((tx) => tx.pure(bytes));
			continue;
		}

		if (typeof arg === 'string') {
			normalizedArgs.push((tx) => tx.object(arg));
			continue;
		}

		throw new Error(`Invalid argument ${stringify(arg)} for type ${argType}`);
	}

	return normalizedArgs;
}

/* -------------------------- Move type tags -------------------------- */

/** A type argument: a type tag string, or a BCS type whose name is a Move type. */
export type TypeArgument = string | BcsType<any>;

export interface TypeTagOptions {
	package?: string;
	typeArguments?: readonly TypeArgument[];
}

/**
 * `typeArguments` is required when the type's name contains unfilled
 * `phantom X` parameters (at any depth). Everything else — argument arity,
 * position contents, and tag validity — is validated at runtime.
 */
type TypeTagParams<Name extends string> = Name extends `${string}phantom ${string}`
	? [options: TypeTagOptions & { typeArguments: readonly TypeArgument[] }]
	: [options?: TypeTagOptions];

type ResolveTypeTagOptions<Name extends string> = {
	client: ClientWithCoreApi;
} & (Name extends `${string}phantom ${string}`
	? TypeTagOptions & { typeArguments: readonly TypeArgument[] }
	: TypeTagOptions);

const HAS_PHANTOM_REGEX = /phantom [A-Za-z_$][A-Za-z0-9_$]*/;

function splitTopLevelTypeArgs(inner: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let current = '';
	for (const char of inner) {
		if (char === ',' && depth === 0) {
			parts.push(current.trim());
			current = '';
			continue;
		}
		if (char === '<') depth++;
		if (char === '>') depth--;
		current += char;
	}
	if (current) parts.push(current.trim());
	return parts;
}

function buildTypeTag(name: string, options: TypeTagOptions | undefined): string {
	const lt = name.indexOf('<');
	const base = lt === -1 ? name : name.slice(0, lt);

	if (base.split('::').length !== 3) {
		throw new Error(`${name} is not a top-level Move type`);
	}

	let result = name;

	if (options?.typeArguments) {
		const baked = lt === -1 ? [] : splitTopLevelTypeArgs(name.slice(lt + 1, -1));
		const supplied = options.typeArguments.map((arg) => {
			if (typeof arg === 'string') {
				return arg;
			}
			if (arg && typeof arg.serialize === 'function' && typeof arg.name === 'string') {
				return arg.name;
			}
			throw new Error(`Invalid type argument ${stringify(arg)}`);
		});

		if (supplied.length !== baked.length) {
			throw new Error(
				`Expected ${baked.length} type arguments for ${base}, got ${supplied.length}`,
			);
		}

		result = supplied.length === 0 ? base : `${base}<${supplied.join(', ')}>`;
	}

	if (HAS_PHANTOM_REGEX.test(result)) {
		throw new Error(
			options?.typeArguments
				? `A type argument contains an unfilled phantom parameter in ${result}`
				: `Missing type arguments for ${result}`,
		);
	}

	if (options?.package) {
		const [, ...rest] = result.split('::');
		result = [options.package, ...rest].join('::');
	}

	// fully validate address-only tags (MVR names can't be parsed as type tags)
	if (!HAS_PHANTOM_REGEX.test(result) && !/[@/]/.test(result)) {
		TypeTagSerializer.parseFromStr(result);
	}

	return result;
}

async function resolveBuiltTypeTag(
	name: string,
	options: { client: ClientWithCoreApi } & TypeTagOptions,
): Promise<string> {
	const { client, ...rest } = options;
	const { type } = await client.core.mvr.resolveType({
		type: buildTypeTag(name, rest),
	});
	return normalizeStructTag(type);
}

export class MoveStruct<
	T extends Record<string, BcsType<any>>,
	const Name extends string = string,
> extends BcsStruct<T, Name> {
	/**
	 * Build the type tag for this struct.
	 *
	 * `typeArguments` is the full positional list, in Move declaration order, and
	 * is required when the struct has unfilled phantom parameters. The result may
	 * contain MVR names: those are valid in transaction `typeArguments`, but for
	 * queries or comparisons against on-chain data use `resolveTypeTag` instead.
	 */
	typeTag(...args: TypeTagParams<Name>): string {
		return buildTypeTag(this.name, args[0] as TypeTagOptions | undefined);
	}

	/**
	 * Build the type tag for this struct, then resolve any MVR names through the
	 * client (using its configured overrides and the MVR API) and return the
	 * normalized, address-only form suitable for queries and comparisons against
	 * on-chain data.
	 */
	async resolveTypeTag(options: ResolveTypeTagOptions<Name>): Promise<string> {
		return resolveBuiltTypeTag(
			this.name,
			options as { client: ClientWithCoreApi } & TypeTagOptions,
		);
	}

	async get<Include extends Omit<SuiClientTypes.ObjectInclude, 'content' | 'json'> = {}>({
		objectId,
		...options
	}: GetOptions<Include>): Promise<
		SuiClientTypes.Object<Include & { content: true; json: true }> & {
			json: BcsStruct<T>['$inferType'];
		}
	> {
		const [res] = await this.getMany<Include>({
			...options,
			objectIds: [objectId],
		});

		if (!res) {
			throw new Error(`No object found for id ${objectId}`);
		}

		return res;
	}

	async getMany<Include extends Omit<SuiClientTypes.ObjectInclude, 'content' | 'json'> = {}>({
		client,
		...options
	}: GetManyOptions<Include>): Promise<
		Array<
			SuiClientTypes.Object<Include & { content: true; json: true }> & {
				json: BcsStruct<T>['$inferType'];
			}
		>
	> {
		const response = (await client.core.getObjects({
			...options,
			include: {
				...options.include,
				content: true,
			},
		})) as SuiClientTypes.GetObjectsResponse<Include & { content: true }>;

		return response.objects.map((obj) => {
			if (obj instanceof Error) {
				throw obj;
			}

			return {
				...obj,
				json: this.parse(obj.content),
			};
		});
	}
}

export class MoveEnum<
	T extends Record<string, BcsType<any> | null>,
	const Name extends string,
> extends BcsEnum<T, Name> {
	/** Build the type tag for this enum. See `MoveStruct.typeTag` for semantics. */
	typeTag(...args: TypeTagParams<Name>): string {
		return buildTypeTag(this.name, args[0] as TypeTagOptions | undefined);
	}

	/** Build and resolve the type tag for this enum. See `MoveStruct.resolveTypeTag`. */
	async resolveTypeTag(options: ResolveTypeTagOptions<Name>): Promise<string> {
		return resolveBuiltTypeTag(
			this.name,
			options as { client: ClientWithCoreApi } & TypeTagOptions,
		);
	}
}

export class MoveTuple<
	const T extends readonly BcsType<any>[],
	const Name extends string,
> extends BcsTuple<T, Name> {
	/** Build the type tag for this struct. See `MoveStruct.typeTag` for semantics. */
	typeTag(...args: TypeTagParams<Name>): string {
		return buildTypeTag(this.name, args[0] as TypeTagOptions | undefined);
	}

	/** Build and resolve the type tag for this struct. See `MoveStruct.resolveTypeTag`. */
	async resolveTypeTag(options: ResolveTypeTagOptions<Name>): Promise<string> {
		return resolveBuiltTypeTag(
			this.name,
			options as { client: ClientWithCoreApi } & TypeTagOptions,
		);
	}
}

function stringify(val: unknown) {
	if (typeof val === 'object') {
		return JSON.stringify(val, (_key, value) =>
			typeof value === 'bigint' ? value.toString() : value,
		);
	}
	if (typeof val === 'bigint') {
		return val.toString();
	}

	return val;
}
