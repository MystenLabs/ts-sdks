// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { analyze, analyzers, createAnalyzer, type Analyzer } from '@mysten/wallet-sdk';

import type { TransactionData, ValidationIssue, Validator } from './validation.js';

/**
 * The analyzer-map shape accepted by the `@mysten/wallet-sdk` `analyze` function.
 *
 * Anchored to the public `analyze` value's first parameter: it's the only bound
 * that is satisfiable by any user `createAnalyzer(...)` map AND preserves each
 * analyzer's result-type generic so it can be projected into validators.
 */
export type AnalyzerMap = Parameters<typeof analyze>[0];

/**
 * The current on-chain epoch — a small analyzer so `boundedExpiration` doesn't
 * fetch it inline (and it dedupes if several validators depend on it).
 */
export const currentEpoch = createAnalyzer({
	cacheKey: 'sponsor:currentEpoch@1',
	analyze: (options: { client: ClientWithCoreApi }) => async () => {
		const { systemState } = await options.client.core.getCurrentSystemState();
		return { result: BigInt(systemState.epoch) };
	},
});

/**
 * The *unwrapped* analysis a validator's `run` receives: each declared analyzer's
 * result value, keyed by name. A failed dependency never reaches `run` (it
 * short-circuits to `ANALYSIS_FAILED`), so these are always resolved values.
 */
export type AnalysisResults<TMap extends AnalyzerMap> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[K in keyof TMap]: TMap[K] extends Analyzer<infer R, any, any> ? R : never;
};

/** A passing result — no issues. */
const pass = { result: null };

/** Build a rejection result from one or more issues. */
function reject(...issues: ValidationIssue[]): { result: ValidationIssue[] } {
	return { result: issues };
}

/**
 * The recommended baseline validators, bundled for one-line inclusion.
 *
 * `createSponsor` runs these automatically when you pass no `validate`. Once you
 * add your own validators they no longer run automatically — include them with
 * `validate: [...defaults(), myValidator()]` (or `[defaults(), ...]`) to keep the
 * baseline: {@link senderIsNotSponsor}, {@link gasCoinNotUsed},
 * {@link onlySenderWithdrawals}, {@link simulationSucceeds}, and
 * {@link boundedExpiration}.
 */
export function defaults(): Validator[] {
	return [
		senderIsNotSponsor(),
		gasCoinNotUsed(),
		onlySenderWithdrawals(),
		simulationSucceeds(),
		boundedExpiration(),
	];
}

/**
 * Reject when the sender is also the sponsor (the gas owner) — there's no
 * legitimate reason to sponsor your own transaction, and allowing it lets a
 * caller drain the sponsor's gas. Part of {@link defaults}. Reads only `data`.
 */
export function senderIsNotSponsor(): Validator {
	return createAnalyzer({
		dependencies: { data: analyzers.data },
		analyze:
			() =>
			({ data }) => {
				if (
					normalizeSuiAddress(data.sender ?? '') === normalizeSuiAddress(data.gasData.owner ?? '')
				) {
					return reject({ code: 'SENDER_IS_SPONSOR', message: 'Sender cannot be the sponsor.' });
				}
				return pass;
			},
	});
}

/** Bound the gas budget the sponsor is willing to cover (in MIST). Reads only `data`. */
export function gasBudget(options: { min?: bigint; max?: bigint }): Validator {
	return createAnalyzer({
		dependencies: { data: analyzers.data },
		analyze:
			() =>
			({ data }) => {
				const budget = data.gasData.budget;
				if (budget == null) {
					return reject({
						code: 'GAS_BUDGET_UNSET',
						message: 'Transaction must have a gas budget set.',
					});
				}
				const value = BigInt(budget);
				if (options.min != null && value < options.min) {
					return reject({
						code: 'GAS_BUDGET_TOO_LOW',
						message: `Gas budget ${value} is below the minimum of ${options.min} MIST.`,
					});
				}
				if (options.max != null && value > options.max) {
					return reject({
						code: 'GAS_BUDGET_TOO_HIGH',
						message: `Gas budget ${value} exceeds the maximum of ${options.max} MIST.`,
					});
				}
				return pass;
			},
	});
}

function moveCalls(data: TransactionData) {
	return data.commands.flatMap((command) =>
		command.$kind === 'MoveCall' ? [command.MoveCall] : [],
	);
}

/**
 * Allow only MoveCalls into the given package IDs. Non-MoveCall commands
 * (transfers, splits, etc.) are unaffected — compose with other validators to
 * constrain those. Reads only `data`.
 */
export function allowedPackages(packageIds: Iterable<string>): Validator {
	const allowed = new Set([...packageIds].map((id) => normalizeSuiAddress(id)));
	return createAnalyzer({
		dependencies: { data: analyzers.data },
		analyze:
			() =>
			({ data }) => {
				const issues = moveCalls(data)
					.filter((call) => !allowed.has(normalizeSuiAddress(call.package)))
					.map((call) => ({
						code: 'PACKAGE_NOT_ALLOWED',
						message: `MoveCall into disallowed package ${call.package}.`,
					}));
				return issues.length ? reject(...issues) : pass;
			},
	});
}

/**
 * Allow only the given fully-qualified `package::module::function` targets.
 * Package addresses are normalized, so short and long forms both match.
 */
export function allowedFunctions(targets: Iterable<string>): Validator {
	const allowed = new Set(
		[...targets].map((target) => {
			const [pkg, module, fn] = target.split('::');
			return `${normalizeSuiAddress(pkg)}::${module}::${fn}`;
		}),
	);
	return createAnalyzer({
		dependencies: { data: analyzers.data },
		analyze:
			() =>
			({ data }) => {
				const issues = moveCalls(data)
					.filter(
						(call) =>
							!allowed.has(
								`${normalizeSuiAddress(call.package)}::${call.module}::${call.function}`,
							),
					)
					.map((call) => ({
						code: 'FUNCTION_NOT_ALLOWED',
						message: `MoveCall to disallowed function ${call.package}::${call.module}::${call.function}.`,
					}));
				return issues.length ? reject(...issues) : pass;
			},
	});
}

/**
 * Every argument across a command, for scanning. Exhaustive over command kinds:
 * a new kind forces a compile error rather than silently bypassing the scan, and
 * an unknown kind at runtime fails closed (the caller rejects on the throw).
 */
function commandArguments(command: TransactionData['commands'][number]): { $kind: string }[] {
	switch (command.$kind) {
		case 'MoveCall':
			return command.MoveCall.arguments;
		case 'TransferObjects':
			return [command.TransferObjects.address, ...command.TransferObjects.objects];
		case 'SplitCoins':
			return [command.SplitCoins.coin, ...command.SplitCoins.amounts];
		case 'MergeCoins':
			return [command.MergeCoins.destination, ...command.MergeCoins.sources];
		case 'MakeMoveVec':
			return command.MakeMoveVec.elements;
		case 'Upgrade':
			return [command.Upgrade.ticket];
		case 'Publish':
			return []; // modules/dependencies only — no argument inputs
		case '$Intent':
			return Object.values(command.$Intent.inputs).flat();
		default: {
			const exhaustive: never = command;
			throw new Error(`Unhandled command kind: ${JSON.stringify(exhaustive)}`);
		}
	}
}

/**
 * Reject transactions whose commands use the gas coin (`tx.gas`). In a sponsored
 * transaction the gas coin is the *sponsor's*, so spending it lets the sender
 * drain the sponsor. Part of {@link defaults}. Reads only `data`.
 */
export function gasCoinNotUsed(): Validator {
	return createAnalyzer({
		dependencies: { data: analyzers.data },
		analyze:
			() =>
			({ data }) => {
				for (const command of data.commands) {
					for (const argument of commandArguments(command)) {
						if (argument.$kind === 'GasCoin') {
							return reject({
								code: 'GAS_COIN_USED',
								message: 'Transaction must not use the gas coin — the sponsor pays gas.',
							});
						}
					}
				}
				return pass;
			},
	});
}

/**
 * Allow **only the sender** to withdraw from an address balance — reject any
 * `FundsWithdrawal` input whose `withdrawFrom` isn't `Sender` (today that's the
 * sponsor; an allowlist also fails closed on any future withdrawal source). The
 * sponsor pays gas from its address balance, so a sponsor withdrawal drains it
 * directly — and because the withdrawal is an *input*, not a command argument,
 * {@link gasCoinNotUsed} doesn't catch it. Part of {@link defaults}. Reads only `data`.
 */
export function onlySenderWithdrawals(): Validator {
	return createAnalyzer({
		dependencies: { data: analyzers.data },
		analyze:
			() =>
			({ data }) => {
				for (const input of data.inputs) {
					if (
						input.$kind === 'FundsWithdrawal' &&
						input.FundsWithdrawal.withdrawFrom.$kind !== 'Sender'
					) {
						return reject({
							code: 'NON_SENDER_WITHDRAWAL',
							message: 'Only the sender may withdraw from an address balance.',
						});
					}
				}
				return pass;
			},
	});
}

/**
 * Reject transactions that don't succeed in a dry-run simulation, so the sponsor
 * doesn't pay gas for a transaction that would abort on-chain. Depends on
 * `transactionResponse` (the dry-run) — so a sponsor that omits this validator
 * never simulates. A failed dry-run propagates as `ANALYSIS_FAILED`.
 *
 * Fails **closed**: a missing or unsuccessful status rejects, so a transaction
 * that couldn't be evaluated is never signed. Simulation success does **not**
 * guarantee execution success — on-chain state can shift before execution, and a
 * later-aborting sponsored transaction still charges the sponsor gas.
 */
export function simulationSucceeds(): Validator {
	return createAnalyzer({
		dependencies: { transactionResponse: analyzers.transactionResponse },
		analyze:
			() =>
			({ transactionResponse }) => {
				const status = transactionResponse.effects?.status;
				if (!status || !status.success) {
					return reject({
						code: 'SIMULATION_FAILED',
						message: `Transaction would fail on-chain: ${JSON.stringify(status?.error ?? 'no status')}`,
					});
				}
				return pass;
			},
	});
}

function expirationMaxEpoch(expiration: TransactionData['expiration']): bigint | null {
	if (!expiration || expiration.$kind === 'None') return null;
	if (expiration.$kind === 'Epoch') return BigInt(expiration.Epoch);
	const max = expiration.ValidDuring.maxEpoch;
	return max == null ? null : BigInt(max);
}

/**
 * Require a bounded epoch expiration: the transaction must expire by at most
 * `currentEpoch + maxEpochsAhead` (default: the next epoch). This caps how long a
 * signed sponsored transaction stays valid, and is also Sui's replay-protection
 * requirement for transactions with no owned inputs (address-balance gas). Part
 * of {@link defaults}.
 */
export function boundedExpiration(options: { maxEpochsAhead?: number } = {}): Validator {
	const maxEpochsAhead = BigInt(options.maxEpochsAhead ?? 1);
	return createAnalyzer({
		dependencies: { data: analyzers.data, currentEpoch },
		analyze:
			() =>
			({ data, currentEpoch }) => {
				const maxEpoch = expirationMaxEpoch(data.expiration);
				if (maxEpoch == null) {
					return reject({
						code: 'EXPIRATION_REQUIRED',
						message:
							'Transaction must set a bounded epoch expiration (valid through the next epoch).',
					});
				}

				// Only bound how far out it may expire — the epoch can advance between
				// build and check, and execution rejects a truly-expired transaction.
				const limit = currentEpoch + maxEpochsAhead;
				if (maxEpoch > limit) {
					return reject({
						code: 'EXPIRATION_TOO_LONG',
						message: `Transaction expires at epoch ${maxEpoch}, beyond the allowed ${limit}.`,
					});
				}
				return pass;
			},
	});
}
