// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Predict v4 retired some entry points by underscore-prefixing their Move parameters
// (`_market`), and codegen renders those argument keys capitalized (`Market`). The public
// move-call exports keep the keys these bindings shipped with, renamed here before calling the
// generated binding, so the emitted move call is unchanged.

/** Rename an arguments object's keys by `keys` (shipped key → generated key). */
export function renameArguments<T>(args: object, keys: Readonly<Record<string, string>>): T {
	return Object.fromEntries(
		Object.entries(args).map(([key, value]) => [keys[key] ?? key, value]),
	) as T;
}
