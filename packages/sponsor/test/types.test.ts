// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { describe, expect, it } from 'vitest';

import { analyzers, createAnalyzer, createSponsor } from '../src/index.js';

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

// A validator that depends on the dry-run typed for `balanceChanges`. Asking
// `transactionResponse<{ balanceChanges: true }>()` for that field both makes the
// requirement surface (typed) on `validationOptions` — via the same inference as
// any other validator option — and types the result so `balanceChanges` is present.
const needsBalanceChanges = createAnalyzer({
	dependencies: { transactionResponse: analyzers.transactionResponse<{ balanceChanges: true }>() },
	analyze:
		() =>
		({ transactionResponse }) => {
			// Typed `BalanceChange[]` (present), not `undefined`.
			const changes: SuiClientTypes.BalanceChange[] = transactionResponse.balanceChanges;
			return changes.length >= 0 ? { result: null } : { result: [{ message: 'no balances' }] };
		},
});

// A second validator depending on the dry-run typed for a *different* field, so we
// can check the two `include` requirements merge rather than clobber each other.
const needsEvents = createAnalyzer({
	dependencies: { transactionResponse: analyzers.transactionResponse<{ events: true }>() },
	analyze:
		() =>
		({ transactionResponse }) => {
			// Typed `Event[]` (present), not `undefined`.
			const events: SuiClientTypes.Event[] = transactionResponse.events;
			return events.length >= 0 ? { result: null } : { result: [{ message: 'no events' }] };
		},
});

// Compile-only. `signAndExecuteTransaction` threads every core-execute prop through
// and combines the requested `include` with the always-on `effects`.
async function _executeOptions() {
	const sponsor = createSponsor({ signer, client });

	// Extra `include` (beyond `effects`) and pass-through props like `signal` are accepted,
	// and the result combines the requested field with the forced `effects`.
	const res = await sponsor.signAndExecuteTransaction({
		transaction: bytes,
		userSignature: 's',
		include: { events: true },
		signal: new AbortController().signal,
	});
	if (res.$kind === 'Transaction') {
		const _effects: SuiClientTypes.TransactionEffects = res.Transaction.effects;
		const _events: SuiClientTypes.Event[] = res.Transaction.events;
		void _effects;
		void _events;
	}

	// No `include` → the result still carries the forced `effects`.
	const plain = await sponsor.signAndExecuteTransaction({ transaction: bytes, userSignature: 's' });
	if (plain.$kind === 'Transaction') {
		const _effects: SuiClientTypes.TransactionEffects = plain.Transaction.effects;
		void _effects;
	}

	void sponsor.signAndExecuteTransaction({
		transaction: bytes,
		userSignature: 's',
		// @ts-expect-error `effects` is always included and can't be turned off
		include: { effects: false },
	});
}

// Compile-only. When several validators each need a different simulate field, the
// required `include` on `validationOptions` is the *merge* of all of them — you must
// pass every field, and supplying only some is a type error.
function _simulateInclude() {
	const sponsor = createSponsor({ signer, client, validate: [needsBalanceChanges, needsEvents] });

	// Both requirements merged → must pass `balanceChanges` AND `events`.
	void sponsor.signTransaction({
		transaction: bytes,
		userSignature: 's',
		validationOptions: { include: { balanceChanges: true, events: true } },
	});
	void sponsor.signAndExecuteTransaction({
		transaction: bytes,
		userSignature: 's',
		validationOptions: { include: { balanceChanges: true, events: true } },
	});

	void sponsor.signTransaction({
		transaction: bytes,
		userSignature: 's',
		// @ts-expect-error `events` is also required (merged from the second validator)
		validationOptions: { include: { balanceChanges: true } },
	});
	void sponsor.signTransaction({
		transaction: bytes,
		userSignature: 's',
		// @ts-expect-error `balanceChanges` is also required (merged from the first validator)
		validationOptions: { include: { events: true } },
	});
	// @ts-expect-error the merged simulate `include` is missing entirely
	void sponsor.signAndExecuteTransaction({ transaction: bytes, userSignature: 's' });
}

describe('validator typing', () => {
	it('compiles (assertions enforced by test:typecheck)', () => {
		void _assertions;
		void _enforcement;
		void _executeOptions;
		void _simulateInclude;
		expect(typeof requiresToken.analyze).toBe('function');
	});
});
