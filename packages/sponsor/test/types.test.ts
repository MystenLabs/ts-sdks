// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { describe, expect, it } from 'vitest';

import { createAnalyzer, createSponsor } from '../src/index.js';

declare const client: ClientWithCoreApi;
declare const signer: Signer;
declare const bytes: Uint8Array;

// A validator that reads a *required* option off `options`.
const requiresToken = createAnalyzer({
	analyze: (options: { authToken: string }) => () =>
		options.authToken === 'ok' ? { result: null } : { result: [{ message: 'bad token' }] },
});

// A validator that reads an *optional* option.
const optionalTenant = createAnalyzer({
	analyze: (options: { tenantId?: string }) => () =>
		options.tenantId === 'blocked' ? { result: [{ message: 'blocked tenant' }] } : { result: null },
});

// Compile-only — never called (the values are `declare`d, so this would throw at
// runtime). `validationOptions` is required iff a validator requires an option.
function _assertions() {
	const reqSponsor = createSponsor({ signer, client, validate: [requiresToken] });
	const optSponsor = createSponsor({ signer, client, validate: [optionalTenant] });
	const plainSponsor = createSponsor({ signer, client });

	// required → must pass `validationOptions: { authToken }`
	void reqSponsor.signTransaction({
		transaction: bytes,
		userSignature: 's',
		validationOptions: { authToken: 'ok' },
	});
	// @ts-expect-error `validationOptions` (with `authToken`) is required
	void reqSponsor.signTransaction({ transaction: bytes, userSignature: 's' });
	void reqSponsor.signTransaction({
		transaction: bytes,
		userSignature: 's',
		// @ts-expect-error `authToken` is required inside `validationOptions`
		validationOptions: {},
	});

	// optional → `validationOptions` may be omitted
	void optSponsor.signTransaction({ transaction: bytes, userSignature: 's' });
	void optSponsor.signTransaction({
		transaction: bytes,
		userSignature: 's',
		validationOptions: { tenantId: 't' },
	});

	// no custom options → no `validationOptions` needed
	void plainSponsor.signTransaction({ transaction: bytes, userSignature: 's' });
}

// Type enforcement — a validator's result must be `ValidationIssue[] | null`.
function _enforcement() {
	const okIssues = createAnalyzer({ analyze: () => () => ({ result: [{ message: 'x' }] }) });
	const badResult = createAnalyzer({ analyze: () => () => ({ result: 'nope' }) });
	const missingMessage = createAnalyzer({ analyze: () => () => ({ result: [{ code: 'X' }] }) });

	void createSponsor({ signer, client, validate: [okIssues] });
	// @ts-expect-error a validator's result must be `ValidationIssue[] | null`, not a string
	void createSponsor({ signer, client, validate: [badResult] });
	// @ts-expect-error issue objects must have a `message`
	void createSponsor({ signer, client, validate: [missingMessage] });
}

describe('validator typing', () => {
	it('compiles (assertions enforced by test:typecheck)', () => {
		void _assertions;
		void _enforcement;
		expect(typeof requiresToken.analyze).toBe('function');
	});
});
