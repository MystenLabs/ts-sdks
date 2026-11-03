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

/**
 * The generated call with its package resolved to the latest account package. Returns the
 * generated function's own type, so optional options and generics are unchanged.
 */
export function latestAccountPackage<Call extends (options: never) => unknown>(call: Call): Call {
	const wrapped = (options?: AccountCallOptions) => {
		const target = options?.package ?? options?.config?.accountPackageIdLatest;
		return (call as unknown as (options?: AccountCallOptions) => unknown)(
			target ? { ...options, package: target } : options,
		);
	};
	return wrapped as unknown as Call;
}
