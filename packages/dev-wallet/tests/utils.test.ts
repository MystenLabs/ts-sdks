// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
	formatAddress,
	getCoinSymbol,
	getCoinDecimals,
	formatCoinBalance,
	getTypeName,
	isCoinType,
	isSuiCoinType,
	isPairableAdapter,
	toggleSetItem,
	getErrorMessage,
	findAdapterForAddress,
	getNetworkFromChain,
} from '../src/ui/utils.js';

describe('formatAddress', () => {
	it('returns short addresses as-is', () => {
		expect(formatAddress('0x1234')).toBe('0x1234');
	});

	it('truncates long addresses', () => {
		const addr = '0x' + 'a'.repeat(64);
		expect(formatAddress(addr)).toBe('0xaaaaaa...aaaaaa');
	});

	it('returns exactly 16-char addresses as-is', () => {
		expect(formatAddress('0x12345678901234')).toBe('0x12345678901234');
	});
});

describe('getCoinSymbol', () => {
	it('returns SUI for native coin type', () => {
		expect(getCoinSymbol('0x2::sui::SUI')).toBe('SUI');
	});

	it('extracts symbol from Move type', () => {
		expect(
			getCoinSymbol(
				'0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
			),
		).toBe('USDC');
	});

	it('returns full string for non-standard types', () => {
		expect(getCoinSymbol('something')).toBe('something');
	});
});

describe('getCoinDecimals', () => {
	it('returns 9 for SUI', () => {
		expect(getCoinDecimals('0x2::sui::SUI')).toBe(9);
	});

	it('returns 6 for USDC', () => {
		expect(getCoinDecimals('0xabc::usdc::USDC')).toBe(6);
	});

	it('returns 0 for unknown tokens', () => {
		expect(getCoinDecimals('0xabc::foo::FOO')).toBe(0);
	});
});

describe('formatCoinBalance', () => {
	it('formats with no decimals', () => {
		expect(formatCoinBalance('12345', 0)).toBe('12345');
	});

	it('formats SUI balance', () => {
		expect(formatCoinBalance('1000000000', 9)).toBe('1');
	});

	it('formats fractional balance', () => {
		expect(formatCoinBalance('1500000000', 9)).toBe('1.5');
	});

	it('formats zero', () => {
		expect(formatCoinBalance('0', 9)).toBe('0');
	});

	it('handles bigint input', () => {
		expect(formatCoinBalance(1000000n, 6)).toBe('1');
	});

	it('strips trailing zeros', () => {
		expect(formatCoinBalance('1100000000', 9)).toBe('1.1');
	});
});

describe('getTypeName', () => {
	it('extracts struct name from full type', () => {
		expect(getTypeName('0x2::coin::Coin<0x2::sui::SUI>')).toBe('Coin');
	});

	it('returns simple names as-is', () => {
		expect(getTypeName('something')).toBe('something');
	});
});

describe('isCoinType', () => {
	it('detects Coin wrapper', () => {
		expect(isCoinType('0x2::coin::Coin<0x2::sui::SUI>')).toBe(true);
	});

	it('rejects non-Coin types', () => {
		expect(isCoinType('0x2::sui::SUI')).toBe(false);
	});
});

describe('isSuiCoinType', () => {
	it('detects SUI coin type', () => {
		expect(isSuiCoinType('0x2::sui::SUI')).toBe(true);
	});

	it('rejects non-SUI types', () => {
		expect(isSuiCoinType('0x2::usdc::USDC')).toBe(false);
	});
});

describe('isPairableAdapter', () => {
	it('returns true for objects with isPaired', () => {
		expect(isPairableAdapter({ isPaired: true })).toBe(true);
	});

	it('returns false for null', () => {
		expect(isPairableAdapter(null)).toBe(false);
	});

	it('returns false for objects without isPaired', () => {
		expect(isPairableAdapter({ name: 'test' })).toBe(false);
	});
});

describe('toggleSetItem', () => {
	it('adds item when not in set', () => {
		const set = new Set(['a', 'b']);
		const result = toggleSetItem(set, 'c');
		expect(result.has('c')).toBe(true);
		expect(result.size).toBe(3);
	});

	it('removes item when already in set', () => {
		const set = new Set(['a', 'b']);
		const result = toggleSetItem(set, 'a');
		expect(result.has('a')).toBe(false);
		expect(result.size).toBe(1);
	});

	it('does not mutate the original set', () => {
		const set = new Set(['a', 'b']);
		toggleSetItem(set, 'c');
		expect(set.size).toBe(2);
	});
});

describe('getErrorMessage', () => {
	it('extracts message from Error instances', () => {
		expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
	});

	it('returns fallback for non-Error values', () => {
		expect(getErrorMessage('string error', 'fallback')).toBe('fallback');
		expect(getErrorMessage(null, 'fallback')).toBe('fallback');
		expect(getErrorMessage(42, 'fallback')).toBe('fallback');
	});
});

describe('getNetworkFromChain', () => {
	it('extracts network from standard chain identifier', () => {
		expect(getNetworkFromChain('sui:testnet')).toBe('testnet');
		expect(getNetworkFromChain('sui:mainnet')).toBe('mainnet');
		expect(getNetworkFromChain('sui:devnet')).toBe('devnet');
		expect(getNetworkFromChain('sui:localnet')).toBe('localnet');
	});

	it('returns undefined for chain without colon', () => {
		expect(getNetworkFromChain('invalid')).toBeUndefined();
	});

	it('handles unknown network names', () => {
		expect(getNetworkFromChain('sui:custom')).toBe('custom');
	});
});

describe('findAdapterForAddress', () => {
	it('finds the adapter that owns the address', () => {
		const adapter1 = {
			name: 'A',
			getAccount: (addr: string) => (addr === '0x1' ? { address: '0x1' } : undefined),
		};
		const adapter2 = {
			name: 'B',
			getAccount: (addr: string) => (addr === '0x2' ? { address: '0x2' } : undefined),
		};

		expect(findAdapterForAddress([adapter1, adapter2], '0x2')?.name).toBe('B');
	});

	it('returns undefined when no adapter owns the address', () => {
		const adapter = { name: 'A', getAccount: () => undefined };
		expect(findAdapterForAddress([adapter], '0xunknown')).toBeUndefined();
	});
});
