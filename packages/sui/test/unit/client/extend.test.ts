// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { SuiGrpcClient } from '../../../src/grpc/client.js';

describe('SuiGrpcClient.$extend', () => {
	it('should allow extending with a single extension', () => {
		const client = new SuiGrpcClient({ baseUrl: 'http://localhost', network: 'testnet' });

		const sdk1 = () => ({
			name: 'sdk1' as const,
			register: () => ({
				foo: () => 'foo',
			}),
		});

		const extended = client.$extend(sdk1());

		expect(extended.sdk1.foo()).toBe('foo');
	});

	it('should allow chaining multiple $extend calls', () => {
		const client = new SuiGrpcClient({ baseUrl: 'http://localhost', network: 'testnet' });

		const sdk1 = () => ({
			name: 'sdk1' as const,
			register: () => ({
				foo: () => 'foo',
			}),
		});

		const sdk2 = () => ({
			name: 'sdk2' as const,
			register: () => ({
				bar: () => 'bar',
			}),
		});

		const extended = client.$extend(sdk1()).$extend(sdk2());

		expect(extended.sdk1.foo()).toBe('foo');
		expect(extended.sdk2.bar()).toBe('bar');
	});

	it('should allow chaining three or more $extend calls', () => {
		const client = new SuiGrpcClient({ baseUrl: 'http://localhost', network: 'testnet' });

		const sdk1 = () => ({
			name: 'sdk1' as const,
			register: () => ({ a: () => 1 }),
		});

		const sdk2 = () => ({
			name: 'sdk2' as const,
			register: () => ({ b: () => 2 }),
		});

		const sdk3 = () => ({
			name: 'sdk3' as const,
			register: () => ({ c: () => 3 }),
		});

		const extended = client.$extend(sdk1()).$extend(sdk2()).$extend(sdk3());

		expect(extended.sdk1.a()).toBe(1);
		expect(extended.sdk2.b()).toBe(2);
		expect(extended.sdk3.c()).toBe(3);
	});

	it('should allow extending with multiple extensions at once', () => {
		const client = new SuiGrpcClient({ baseUrl: 'http://localhost', network: 'testnet' });

		const sdk1 = () => ({
			name: 'sdk1' as const,
			register: () => ({
				foo: () => 'foo',
			}),
		});

		const sdk2 = () => ({
			name: 'sdk2' as const,
			register: () => ({
				bar: () => 'bar',
			}),
		});

		const extended = client.$extend(sdk1(), sdk2());

		expect(extended.sdk1.foo()).toBe('foo');
		expect(extended.sdk2.bar()).toBe('bar');
	});

	it('should preserve client methods after extending', () => {
		const client = new SuiGrpcClient({ baseUrl: 'http://localhost', network: 'testnet' });

		const sdk1 = () => ({
			name: 'sdk1' as const,
			register: () => ({
				foo: () => 'foo',
			}),
		});

		const extended = client.$extend(sdk1());

		expect(typeof extended.getObjects).toBe('function');
		expect(typeof extended.getBalance).toBe('function');
	});
});
