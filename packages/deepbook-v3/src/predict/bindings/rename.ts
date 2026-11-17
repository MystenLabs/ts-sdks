// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Predict v4 retired some entry points by underscore-prefixing their Move parameters
// (`_market`), and codegen renders those argument keys capitalized (`Market`). The public
// move-call exports keep the keys these bindings shipped with, renamed here before calling the
// generated binding, so the emitted move call is unchanged.

/**
 * Rename an arguments object's keys by `keys` (shipped key → generated key). A positional tuple
 * has no keys, so it passes through unchanged.
 */
export function renameArguments<T>(args: object, keys: Readonly<Record<string, string>>): T {
	if (Array.isArray(args)) return args as T;
	return Object.fromEntries(
		Object.entries(args).map(([key, value]) => [keys[key] ?? key, value]),
	) as T;
}

// The named-argument form of a generated call's options, and its positional tuple.
type NamedArgs<O extends { arguments?: unknown }> = Exclude<
	NonNullable<O['arguments']>,
	readonly unknown[]
>;
type PositionalArgs<O extends { arguments?: unknown }> = Extract<
	O['arguments'],
	readonly unknown[]
>;

/**
 * The generated argument object with the keys in `L` written as they shipped: `Market` back to
 * `market`. Optionality is kept.
 */
export type ShippedArguments<A, L extends string> = {
	[K in keyof A as K extends Capitalize<L> ? Uncapitalize<K & string> : K]: A[K];
};

/** A generated call's options with the shipped argument keys `L`. */
export type ShippedOptions<O extends { arguments?: unknown }, L extends string> = Omit<
	O,
	'arguments'
> & { arguments: ShippedArguments<NamedArgs<O>, L> | PositionalArgs<O> };

/**
 * Wrap a generated call whose Move parameters a later version underscore-prefixed, so it takes the
 * argument keys it shipped with (`keys`, camelCase) and emits the same move call.
 */
export function withShippedKeys<O extends { arguments?: unknown }, R, const L extends string>(
	generated: (options: O) => R,
	keys: readonly L[],
): (options: ShippedOptions<O, L>) => R {
	const map = Object.fromEntries(keys.map((k) => [k, k.charAt(0).toUpperCase() + k.slice(1)]));
	return (options) =>
		generated({ ...options, arguments: renameArguments(options.arguments, map) } as unknown as O);
}
