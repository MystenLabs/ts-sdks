// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The public `account_registry` bindings: the generated ones, each calling the latest account package
// (see `latest.ts`). Types and BCS layouts are re-exported unchanged.

import * as generated from '../contracts/account/account_registry.js';
import { latestAccountPackage } from './latest.js';

export * from '../contracts/account/account_registry.js';

export const derivedAddress = latestAccountPackage(generated.derivedAddress);
export const derivedWrapperAddress = latestAccountPackage(generated.derivedWrapperAddress);
export const derivedExists = latestAccountPackage(generated.derivedExists);
export const derivedWrapperExists = latestAccountPackage(generated.derivedWrapperExists);
export const _new = latestAccountPackage(generated._new);
export const newWithReferrer = latestAccountPackage(generated.newWithReferrer);
export const newSelfOwned = latestAccountPackage(generated.newSelfOwned);
export const isAppAuthorized = latestAccountPackage(generated.isAppAuthorized);
export const authorizeApp = latestAccountPackage(generated.authorizeApp);
export const deauthorizeApp = latestAccountPackage(generated.deauthorizeApp);
export const assertAppIsAuthorized = latestAccountPackage(generated.assertAppIsAuthorized);
export const generateAuthAsApp = latestAccountPackage(generated.generateAuthAsApp);

/** Every generated function wrapped above, for the completeness test. */
export const WRAPPED = Object.freeze([
	'derivedAddress',
	'derivedWrapperAddress',
	'derivedExists',
	'derivedWrapperExists',
	'_new',
	'newWithReferrer',
	'newSelfOwned',
	'isAppAuthorized',
	'authorizeApp',
	'deauthorizeApp',
	'assertAppIsAuthorized',
	'generateAuthAsApp',
] as const);
