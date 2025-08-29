// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

type RedactedRegistry = WeakMap<Redacted<any>, any>;

const moduleRedactedRegistry: RedactedRegistry = new WeakMap();

const REDACTED_REGISTRY_KEY = Symbol.for('@mysten/redacted/registry');
function getRedactedRegistry() {
	try {
		const target = globalThis as {
			[REDACTED_REGISTRY_KEY]?: RedactedRegistry;
		};

		if (!target[REDACTED_REGISTRY_KEY]) {
			target[REDACTED_REGISTRY_KEY] = moduleRedactedRegistry;
		}

		return target[REDACTED_REGISTRY_KEY];
	} catch (e) {
		return moduleRedactedRegistry;
	}
}

const RedactedType: unique symbol = Symbol.for('@mysten/redacted');
export interface Redacted<T> {
	[RedactedType]: T;
}

export function getRedactedValue<T>(redacted: Redacted<T>): T {
	const redactedRegistry = getRedactedRegistry();

	if (redactedRegistry.has(redacted)) {
		return redactedRegistry.get(redacted) as T;
	} else {
		throw new Error('Unable to get redacted value');
	}
}

export function redacted<T>(value: T): Redacted<T> {
	const redactedRegistry = getRedactedRegistry();

	const redacted = {
		[RedactedType]: true,
		[Symbol.toStringTag]: 'Redacted',
		[Symbol.for('nodejs.util.inspect.custom')]: () => '<redacted>',
		toString() {
			return '<redacted>';
		},
		toJSON() {
			return '<redacted>';
		},
	};

	redactedRegistry.set(redacted, value);

	return redacted as never;
}

export function isRedacted(value: any): value is Redacted<any> {
	return typeof value === 'object' && Object.hasOwn(value, RedactedType);
}

/** @internal */
export function getRedactedOrPlainValue<T>(value: T | Redacted<T>): T {
	if (isRedacted(value)) {
		return getRedactedValue(value);
	}

	return value;
}
