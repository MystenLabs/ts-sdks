import {
	bcs,
	type BcsType,
	type TypeTag,
	TypeTagSerializer,
	BcsStruct,
	BcsEnum,
	BcsTuple,
	type BcsStructOptions,
	type BcsEnumOptions,
	type BcsTupleOptions,
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

/** A type argument: a type tag string, or any BCS type whose name is a Move type. */
export type TypeArgument = string | { name: string };

type ArgName<A extends TypeArgument> = A extends string
	? A extends { name: unknown }
		? never // inference artifact (`'lit' & { name: ... }`), not a real input
		: A
	: A extends { name: infer N extends string }
		? N
		: string;

/** Does the name contain an unfilled `phantom X` hole (at any depth)? */
type HasHoles<Name extends string> = Name extends `${string}phantom ${string}` ? true : false;

type IsMoveTypeName<Name extends string> = Name extends `${string}::${string}::${string}`
	? true
	: false;

/** `0x2::vec_map::VecMap<u8, u64>` -> `0x2::vec_map::VecMap` */
type BasePrefix<Name extends string> = Name extends `${infer Base}<${string}>` ? Base : Name;

type SplitCommas<S extends string, Acc extends string[] = []> = S extends `${infer A},${infer B}`
	? SplitCommas<B, [...Acc, A]>
	: [...Acc, S];

type CountLt<S extends string, A extends 0[] = []> = S extends `${string}<${infer R}`
	? CountLt<R, [...A, 0]>
	: A;
type CountGt<S extends string, A extends 0[] = []> = S extends `${string}>${infer R}`
	? CountGt<R, [...A, 0]>
	: A;
type IsBalanced<S extends string> = CountLt<S>['length'] extends CountGt<S>['length']
	? true
	: false;

type Trim<S extends string> = S extends ` ${infer R}` ? Trim<R> : S;

/** Re-merge comma-split segments whose angle brackets are unbalanced. */
type MergeSegments<
	Segs extends readonly string[],
	Cur extends string | null = null,
	Out extends string[] = [],
> = Segs extends readonly [infer H extends string, ...infer T extends string[]]
	? Cur extends string
		? IsBalanced<`${Cur},${H}`> extends true
			? MergeSegments<T, null, [...Out, Trim<`${Cur},${H}`>]>
			: MergeSegments<T, `${Cur},${H}`, Out>
		: IsBalanced<H> extends true
			? MergeSegments<T, null, [...Out, Trim<H>]>
			: MergeSegments<T, H, Out>
	: Out;

/** The type's type arguments as written in its name, in declaration order. */
type TypeArgsOf<Name extends string> = Name extends `${string}<${infer Inner}>`
	? MergeSegments<SplitCommas<Inner>>
	: [];

/** Skip a phantom parameter identifier (ends at the first `,` or `>`). */
type AfterParam<S extends string> = S extends `${infer Id},${infer Rest}`
	? Id extends `${string}>${string}`
		? S extends `${string}>${infer R}`
			? `>${R}`
			: never
		: `,${Rest}`
	: S extends `${string}>${infer Rest}`
		? `>${Rest}`
		: '';

/** Replace `phantom X` holes with `${string}` wildcards. */
type HoleToWildcard<S extends string> = S extends `${infer Pre}phantom ${infer Rest}`
	? `${Pre}${string}${HoleToWildcard<AfterParam<Rest>>}`
	: S;

/** Wildcard the package segment of a single `pkg::mod::Name` head. */
type WildcardHead<S extends string> = S extends `${infer _Pkg}::${infer Rest}`
	? `${string}::${Rest}`
	: S;

/**
 * Structural pattern of a baked type argument: package identifiers (short or
 * normalized addresses, or MVR names) are interchangeable at every nesting
 * level, phantom holes are free, and everything else stays anchored.
 */
type PatternOf<E extends string> = E extends `phantom ${string}`
	? `${string}`
	: E extends `${infer Head}<${infer Inner}>`
		? `${WildcardHead<Head>}<${JoinPatterns<MergeSegments<SplitCommas<Inner>>>}>`
		: WildcardHead<E>;

type JoinPatterns<T extends readonly string[]> = T extends readonly [
	infer H extends string,
	...infer R extends readonly string[],
]
	? R extends readonly []
		? PatternOf<H>
		: `${PatternOf<H>}, ${JoinPatterns<R>}`
	: '';

/**
 * What may be supplied at each position:
 * - phantom positions accept any type
 * - instantiated positions accept the exact baked literal (kept distinct via
 *   `& {}` so autocomplete shows the canonical form) or any package-substituted
 *   variant of it: structure and filled type arguments stay locked
 */
type ArgPattern<E extends string> = HoleToWildcard<E> | (PatternOf<E> & {});
type ArgInput<E extends string> = ArgPattern<E> | { name: ArgPattern<E> };

type MapArgInputs<Args extends readonly string[]> = {
	[K in keyof Args]: ArgInput<Args[K] & string>;
};

/** The expected `typeArguments` tuple for a type, by position. */
type TypeArgumentsFor<Name extends string> = MapArgInputs<TypeArgsOf<Name>>;

/** Default: the baked arguments themselves, so zero-argument calls rebuild the exact name. */
type DefaultTypeArgs<Name extends string> =
	TypeArgsOf<Name> extends infer D extends TypeArgumentsFor<Name> ? D : never;

type ArgNames<Args extends readonly TypeArgument[]> = {
	[K in keyof Args]: ArgName<Args[K] & TypeArgument>;
};

type Join<T extends readonly string[]> = T extends readonly [
	infer H extends string,
	...infer R extends readonly string[],
]
	? R extends readonly []
		? H
		: `${H}, ${Join<R>}`
	: '';

/** The tag built from a name and its supplied type arguments. */
type BuiltTag<Name extends string, Args extends readonly TypeArgument[]> = string extends Name
	? string
	: TypeArgsOf<Name> extends readonly []
		? Name
		: ArgNames<Args> extends infer N extends readonly string[]
			? `${BasePrefix<Name>}<${Join<N>}>`
			: never;

type ReplacePackage<Name extends string, P extends string> = [P] extends [never]
	? Name
	: Name extends `${string}::${infer Mod}::${infer Rest}`
		? `${P}::${Mod}::${Rest}`
		: Name;

/** Reject type arguments that would leave an unfilled phantom hole in the output. */
type NoUnfilledHoles<Name extends string, Args extends readonly TypeArgument[]> =
	HasHoles<BuiltTag<Name, Args>> extends true
		? { typeArguments: 'ERROR: a type argument contains an unfilled phantom parameter' }
		: unknown;

type TypeTagParams<
	Name extends string,
	Args extends readonly TypeArgument[],
	P extends string,
> = string extends Name
	? [options?: { package?: P; typeArguments?: readonly TypeArgument[] }]
	: IsMoveTypeName<Name> extends false
		? [options: 'ERROR: this type does not have a top-level Move type name']
		: HasHoles<Name> extends true
			? [options: { package?: P; typeArguments: Args } & NoUnfilledHoles<Name, Args>]
			: [options?: { package?: P; typeArguments?: Args } & NoUnfilledHoles<Name, Args>];

type ResolveTypeTagParams<
	Name extends string,
	Args extends readonly TypeArgument[],
> = string extends Name
	? [
			options: {
				client: ClientWithCoreApi;
				package?: string;
				typeArguments?: readonly TypeArgument[];
			},
		]
	: IsMoveTypeName<Name> extends false
		? [options: 'ERROR: this type does not have a top-level Move type name']
		: HasHoles<Name> extends true
			? [
					options: {
						client: ClientWithCoreApi;
						package?: string;
						typeArguments: Args;
					} & NoUnfilledHoles<Name, Args>,
				]
			: [
					options: {
						client: ClientWithCoreApi;
						package?: string;
						typeArguments?: Args;
					} & NoUnfilledHoles<Name, Args>,
				];

const PHANTOM_HOLES_REGEX = /phantom [A-Za-z_$][A-Za-z0-9_$]*/g;
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

interface BuildTypeTagOptions {
	package?: string;
	typeArguments?: readonly TypeArgument[];
}

function buildTypeTag(
	name: string,
	options: BuildTypeTagOptions | string | undefined,
	{ allowHoles = false } = {},
): string {
	if (typeof options === 'string') {
		// reachable only when the compile-time error sentinel is ignored
		throw new Error(options);
	}

	const lt = name.indexOf('<');
	const base = lt === -1 ? name : name.slice(0, lt);

	if (base.split('::').length !== 3) {
		throw new Error(`${name} is not a top-level Move type`);
	}

	let result = name;

	if (options?.typeArguments) {
		const baked = lt === -1 ? [] : splitTopLevelTypeArgs(name.slice(lt + 1, -1));
		const supplied = options.typeArguments.map((arg) => (typeof arg === 'string' ? arg : arg.name));

		if (supplied.length !== baked.length) {
			throw new Error(
				`Expected ${baked.length} type arguments for ${base}, got ${supplied.length}`,
			);
		}

		for (let i = 0; i < baked.length; i++) {
			const bakedArg = baked[i]!;
			const suppliedArg = supplied[i]!;
			// package identifiers can't be verified without resolution, so they are
			// wildcards; structure, primitives, and filled arguments stay anchored,
			// and phantom holes are free
			const pattern = new RegExp(
				`^${bakedArg
					.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
					.replace(PHANTOM_HOLES_REGEX, '.+')
					.replace(/(^|<|, )([^,<>]+?)::/g, '$1[^,<>]+?::')}$`,
			);

			if (!pattern.test(suppliedArg)) {
				throw new Error(
					`Type argument ${suppliedArg} at position ${i} does not match ${bakedArg} in ${name}`,
				);
			}
		}

		result = supplied.length === 0 ? base : `${base}<${supplied.join(', ')}>`;
	}

	if (!allowHoles && HAS_PHANTOM_REGEX.test(result)) {
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
	options: { client: ClientWithCoreApi } & BuildTypeTagOptions,
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
	#options: BcsStructOptions<T, Name>;

	constructor(options: BcsStructOptions<T, Name>) {
		super(options);
		this.#options = options;
	}

	/**
	 * Build the type tag for this struct.
	 *
	 * `typeArguments` is the full positional list, in Move declaration order.
	 * Phantom positions accept any type; instantiated positions must restate the
	 * type the instance was created with (package identifiers — short addresses,
	 * normalized addresses, and MVR names — are interchangeable). The result may
	 * contain MVR names: those are valid in transaction `typeArguments`, but for
	 * queries or comparisons against on-chain data use `resolveTypeTag` instead.
	 */
	typeTag<
		const Args extends TypeArgumentsFor<Name> = DefaultTypeArgs<Name>,
		const P extends string = never,
	>(...args: TypeTagParams<Name, Args, P>): ReplacePackage<BuiltTag<Name, Args>, P> {
		return buildTypeTag(this.name, args[0]) as never;
	}

	/**
	 * Build the type tag for this struct, then resolve any MVR names through the
	 * client (using its configured overrides and the MVR API) and return the
	 * normalized, address-only form suitable for queries and comparisons against
	 * on-chain data.
	 */
	async resolveTypeTag<const Args extends TypeArgumentsFor<Name> = DefaultTypeArgs<Name>>(
		...args: ResolveTypeTagParams<Name, Args>
	): Promise<string> {
		const options = args[0];
		if (typeof options === 'string') {
			throw new Error(options);
		}
		return resolveBuiltTypeTag(this.name, options);
	}

	/**
	 * Create a copy of this type with type arguments applied to its name.
	 * Arguments may keep `phantom X` placeholders open (partial application);
	 * `typeTag` will then require the remaining holes to be filled.
	 */
	withTypeArguments<const Args extends TypeArgumentsFor<Name>>(
		typeArguments: Args,
	): MoveStruct<T, BuiltTag<Name, Args>> {
		return new MoveStruct({
			...this.#options,
			name: buildTypeTag(this.name, { typeArguments }, { allowHoles: true }) as BuiltTag<
				Name,
				Args
			>,
		});
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
	#options: BcsEnumOptions<T, Name>;

	constructor(options: BcsEnumOptions<T, Name>) {
		super(options);
		this.#options = options;
	}

	/** Build the type tag for this enum. See `MoveStruct.typeTag` for semantics. */
	typeTag<
		const Args extends TypeArgumentsFor<Name> = DefaultTypeArgs<Name>,
		const P extends string = never,
	>(...args: TypeTagParams<Name, Args, P>): ReplacePackage<BuiltTag<Name, Args>, P> {
		return buildTypeTag(this.name, args[0]) as never;
	}

	/** Build and resolve the type tag for this enum. See `MoveStruct.resolveTypeTag`. */
	async resolveTypeTag<const Args extends TypeArgumentsFor<Name> = DefaultTypeArgs<Name>>(
		...args: ResolveTypeTagParams<Name, Args>
	): Promise<string> {
		const options = args[0];
		if (typeof options === 'string') {
			throw new Error(options);
		}
		return resolveBuiltTypeTag(this.name, options);
	}

	/** Create a copy of this type with type arguments applied to its name. */
	withTypeArguments<const Args extends TypeArgumentsFor<Name>>(
		typeArguments: Args,
	): MoveEnum<T, BuiltTag<Name, Args>> {
		return new MoveEnum({
			...this.#options,
			name: buildTypeTag(this.name, { typeArguments }, { allowHoles: true }) as BuiltTag<
				Name,
				Args
			>,
		});
	}
}

export class MoveTuple<
	const T extends readonly BcsType<any>[],
	const Name extends string,
> extends BcsTuple<T, Name> {
	#options: BcsTupleOptions<T, Name>;

	constructor(options: BcsTupleOptions<T, Name>) {
		super(options);
		this.#options = options;
	}

	/** Build the type tag for this struct. See `MoveStruct.typeTag` for semantics. */
	typeTag<
		const Args extends TypeArgumentsFor<Name> = DefaultTypeArgs<Name>,
		const P extends string = never,
	>(...args: TypeTagParams<Name, Args, P>): ReplacePackage<BuiltTag<Name, Args>, P> {
		return buildTypeTag(this.name, args[0]) as never;
	}

	/** Build and resolve the type tag for this struct. See `MoveStruct.resolveTypeTag`. */
	async resolveTypeTag<const Args extends TypeArgumentsFor<Name> = DefaultTypeArgs<Name>>(
		...args: ResolveTypeTagParams<Name, Args>
	): Promise<string> {
		const options = args[0];
		if (typeof options === 'string') {
			throw new Error(options);
		}
		return resolveBuiltTypeTag(this.name, options);
	}

	/** Create a copy of this type with type arguments applied to its name. */
	withTypeArguments<const Args extends TypeArgumentsFor<Name>>(
		typeArguments: Args,
	): MoveTuple<T, BuiltTag<Name, Args>> {
		return new MoveTuple({
			...this.#options,
			name: buildTypeTag(this.name, { typeArguments }, { allowHoles: true }) as BuiltTag<
				Name,
				Args
			>,
		});
	}
}

function stringify(val: unknown) {
	if (typeof val === 'object') {
		return JSON.stringify(val, (val: unknown) => val);
	}
	if (typeof val === 'bigint') {
		return val.toString();
	}

	return val;
}
