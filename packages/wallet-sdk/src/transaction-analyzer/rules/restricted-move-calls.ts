// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiAddress } from '@mysten/sui/utils';
import { createAnalyzer } from '../analyzer.js';
import { data } from './core.js';

export type RestrictionLevel = 'block' | 'warn';

/**
 * How a target is restricted: a level, `false` (no restriction, so a preset key
 * can be turned off), or a level with exceptions. `except` lists targets inside
 * the key's scope (`pkg`, `pkg::module` or `pkg::module::function`) that the key
 * doesn't flag.
 */
export type RestrictedTarget =
	RestrictionLevel | false | { level: RestrictionLevel; except?: string[] };

export interface RestrictedMoveCallsOptions {
	/**
	 * Level for calls into `0x2::address_alias`, which change which addresses can
	 * sign for an account. Default: `'block'`. `false` turns it off.
	 */
	addressAliases?: RestrictionLevel | false;
	/**
	 * Restricted targets, keyed by `pkg`, `pkg::module`, `pkg::module::function`,
	 * or `'*'` (every MoveCall). Each key is matched on its own: its `except` only
	 * narrows that key, and a call is flagged when any key flags it.
	 */
	targets?: Record<string, RestrictedTarget>;
}

export interface RestrictedMoveCall {
	/** Index of the MoveCall command in the transaction. */
	index: number;
	/** The call's target, `pkg::module::function`, with a normalized package address. */
	target: string;
	/** The most severe level of the keys that flagged the call (`block` over `warn`). */
	level: RestrictionLevel;
	/** The keys that flagged the call: `'addressAliases'` or a `targets` key. */
	matchedBy: string[];
}

interface TargetPattern {
	package: string | null;
	module: string | null;
	function: string | null;
}

interface CompiledRule {
	key: string;
	level: RestrictionLevel;
	pattern: TargetPattern;
	except: TargetPattern[];
}

const ADDRESS_ALIAS_TARGET = '0x2::address_alias';
const WILDCARD = '*';

function parseTarget(target: string): TargetPattern {
	if (target === WILDCARD) {
		return { package: null, module: null, function: null };
	}

	const parts = target.split('::');
	if (parts.length > 3 || parts.some((part) => part.length === 0)) {
		throw new Error(
			`Invalid restricted Move call target "${target}": expected "*", "pkg", "pkg::module", or "pkg::module::function"`,
		);
	}

	const [pkg, module, fn] = parts;
	return { package: normalizeSuiAddress(pkg), module: module ?? null, function: fn ?? null };
}

function matches(pattern: TargetPattern, pkg: string, module: string, fn: string) {
	return (
		(pattern.package === null || pattern.package === pkg) &&
		(pattern.module === null || pattern.module === module) &&
		(pattern.function === null || pattern.function === fn)
	);
}

/** Whether every call `inner` matches is also matched by `outer`. */
function isWithin(inner: TargetPattern, outer: TargetPattern) {
	return (
		(outer.package === null || outer.package === inner.package) &&
		(outer.module === null || outer.module === inner.module) &&
		(outer.function === null || outer.function === inner.function)
	);
}

function compileRule(key: string, target: string, value: RestrictedTarget): CompiledRule | null {
	if (value === false) return null;

	const pattern = parseTarget(target);
	const { level, except = [] } = typeof value === 'string' ? { level: value } : value;
	const exceptPatterns = except.map((exceptTarget) => {
		const exception = parseTarget(exceptTarget);
		if (!isWithin(exception, pattern)) {
			throw new Error(`Exception "${exceptTarget}" is not within restricted target "${target}"`);
		}
		return exception;
	});

	return { key, level, pattern, except: exceptPatterns };
}

/**
 * Creates an analyzer that finds MoveCalls into restricted packages, modules or
 * functions. It only reports what it finds and adds no issues: the caller decides
 * what each level means, for example to warn the user or to refuse to sign.
 *
 * Calls into `0x2::address_alias` are flagged as `'block'` unless
 * `addressAliases` says otherwise. Each call returns a new analyzer, so several
 * configurations can run in the same `analyze()` call.
 *
 * ```ts
 * const restricted = restrictedMoveCalls({
 *   targets: {
 *     '0x2::allowance': { level: 'warn', except: ['0x2::allowance::new'] },
 *     '*': { level: 'warn', except: ['0x2', '0xapp'] }, // packages the app doesn't know
 *   },
 * });
 * ```
 *
 * Throws if a target or exception is malformed, or an exception is outside its key.
 */
export function restrictedMoveCalls({
	addressAliases = 'block',
	targets = {},
}: RestrictedMoveCallsOptions = {}) {
	const rules = [
		compileRule('addressAliases', ADDRESS_ALIAS_TARGET, addressAliases),
		...Object.entries(targets).map(([key, value]) => compileRule(key, key, value)),
	].filter((rule): rule is CompiledRule => rule !== null);

	return createAnalyzer({
		dependencies: { data },
		analyze:
			() =>
			({ data }) => {
				const result: RestrictedMoveCall[] = [];

				data.commands.forEach((command, index) => {
					if (command.$kind !== 'MoveCall') return;
					const pkg = normalizeSuiAddress(command.MoveCall.package);
					const { module, function: fn } = command.MoveCall;

					const flaggedBy = rules.filter(
						(rule) =>
							matches(rule.pattern, pkg, module, fn) &&
							!rule.except.some((exception) => matches(exception, pkg, module, fn)),
					);
					if (flaggedBy.length === 0) return;

					result.push({
						index,
						target: `${pkg}::${module}::${fn}`,
						level: flaggedBy.some((rule) => rule.level === 'block') ? 'block' : 'warn',
						matchedBy: flaggedBy.map((rule) => rule.key),
					});
				});

				return { result };
			},
	});
}
