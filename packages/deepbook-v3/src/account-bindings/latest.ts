// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Account calls target the latest `account` package, while `accountPackageId` stays the
// original id everywhere: the derived wrapper and account addresses and every type tag are
// built from it, because Move types keep their defining package across upgrades. A PTB can't
// call a package at an older version than another package in it links, and Predict's Version 5
// links account v2, so an account call at the original id beside it aborts `InvalidLinkage`.
// The generated bindings resolve their package from `config.accountPackageId`, so every one is
// wrapped here to resolve `package`, then `config.accountPackageIdLatest`, then that.

export interface AccountCallOptions {
	package?: string;
	config?: { accountPackageId?: string; accountPackageIdLatest?: string };
}

/** An options type whose `config` also accepts the latest account package. */
export type WithLatestConfig<Options> = Options extends { config?: infer Config }
	? Omit<Options, 'config'> & { config?: Config & { accountPackageIdLatest?: string } }
	: Options;

/** A generated call whose options' `config` also accepts `accountPackageIdLatest`. */
export type LatestAccountCall<Call> = Call extends (...args: infer Args) => infer Result
	? (...args: { [K in keyof Args]: WithLatestConfig<Args[K]> }) => Result
	: never;

/**
 * The generated call with its package resolved to the latest account package. Options stay
 * optional where the generated call's are; `config` also accepts `accountPackageIdLatest`.
 */
export function latestAccountPackage<Call extends (options: never) => unknown>(
	call: Call,
): LatestAccountCall<Call> {
	const wrapped = (options?: AccountCallOptions) => {
		const target = options?.package ?? options?.config?.accountPackageIdLatest;
		return (call as unknown as (options?: AccountCallOptions) => unknown)(
			target ? { ...options, package: target } : options,
		);
	};
	return wrapped as unknown as LatestAccountCall<Call>;
}
