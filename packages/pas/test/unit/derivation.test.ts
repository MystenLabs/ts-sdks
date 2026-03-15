// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { deriveAccountAddress, derivePolicyAddress } from '../../src/derivation.js';
import type { PASPackageConfig } from '../../src/types.js';

describe('PAS Object Derivation', () => {
	const packageConfig: PASPackageConfig = {
		packageId: '0x123',
		namespaceId: '0xabc',
	};

	describe('deriveAccountAddress', () => {
		it('should derive account address for owner 0x456', () => {
			const accountId = deriveAccountAddress('0x456', packageConfig);
			expect(accountId).toMatchInlineSnapshot(
				`"0x9605073416559b859b4dd1da95bf2dabf4fa950fd5e25b577cc8b7ff8e02d064"`,
			);
		});

		it('should derive account address for owner 0x789', () => {
			const accountId = deriveAccountAddress('0x789', packageConfig);
			expect(accountId).toMatchInlineSnapshot(
				`"0xa4f66e119756ac7f2b17c8b578f09269eaac2c7116abc6ffa5eadd080cacbfb5"`,
			);
		});

		it('should derive account address for different namespace', () => {
			const config = { ...packageConfig, namespaceId: '0xdef' };
			const accountId = deriveAccountAddress('0x456', config);
			expect(accountId).toMatchInlineSnapshot(
				`"0xdc173ff5543875bbb241fa9056aae7fbad0d77f14496d32b2a9d3e4bfaaa6ac8"`,
			);
		});

		it('should normalize addresses correctly', () => {
			const accountId1 = deriveAccountAddress('0x1', packageConfig);
			const accountId2 = deriveAccountAddress(
				'0x0000000000000000000000000000000000000000000000000000000000000001',
				packageConfig,
			);

			expect(accountId1).toBe(accountId2);
			expect(accountId1).toMatchInlineSnapshot(
				`"0xe078596559d864cf753670c3114ad6b0e61a56c563f41648cf2832bd78bdfa5d"`,
			);
		});

		it('should derive account for object owner', () => {
			const accountId = deriveAccountAddress(
				'0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
				packageConfig,
			);
			expect(accountId).toMatchInlineSnapshot(
				`"0x3df40ec902430b690b682ecdf489bf8884bdc963c79f677db17f21b7a0e7a0b9"`,
			);
		});
	});

	describe('derivePolicyAddress', () => {
		it('should derive policy address for SUI (Balance-wrapped)', () => {
			const policyId = derivePolicyAddress('0x2::sui::SUI', packageConfig);
			expect(policyId).toMatchInlineSnapshot(
				`"0xafc3922318beb884092ce0349fae45b00cc46913dfd72247c48ad1ca890734ab"`,
			);
		});

		it('should derive policy address for custom token (Balance-wrapped)', () => {
			const policyId = derivePolicyAddress('0x123::custom::TOKEN', packageConfig);
			expect(policyId).toMatchInlineSnapshot(
				`"0x0c363b471efa71550b30f4a634fc6f35e0ac357a4a107c7e8f9a0f179334912b"`,
			);
		});

		it('should derive policy address for USDC (Balance-wrapped)', () => {
			const policyId = derivePolicyAddress(
				'0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
				packageConfig,
			);
			expect(policyId).toMatchInlineSnapshot(
				`"0xe87bda7a9b045040fe9a6882e6d69f9fb1c79abb804472b273d2ce4b1430bb34"`,
			);
		});

		it('should derive policy address for different namespace', () => {
			const config = { ...packageConfig, namespaceId: '0xdef' };
			const policyId = derivePolicyAddress('0x2::sui::SUI', config);
			expect(policyId).toMatchInlineSnapshot(
				`"0x182cd5446391f7a5be59e6f79beb0c0ed1e3532543f82d37d8a41f13c6dae130"`,
			);
		});

		it('should handle complex generic types (Balance-wrapped)', () => {
			const policyId = derivePolicyAddress(
				'0x2::coin::Coin<0x123::my_token::MY_TOKEN>',
				packageConfig,
			);
			expect(policyId).toMatchInlineSnapshot(
				`"0xb347105016824245f2bc3611bd7d2f9761b68edf4105837e3372710abcff0912"`,
			);
		});

		it('should handle nested generics (Balance-wrapped)', () => {
			const policyId = derivePolicyAddress(
				'0x1::option::Option<0x2::coin::Coin<0x2::sui::SUI>>',
				packageConfig,
			);
			expect(policyId).toMatchInlineSnapshot(
				`"0x3851acd50e6a5c86fd8ae0e8acd8aee738849c10f399ac78e4c46ea0a4e8a880"`,
			);
		});

		it('should allow raw derivation via wrapType identity', () => {
			const policyId = derivePolicyAddress('0x2::sui::SUI', packageConfig, {
				wrapType: (t) => t,
			});
			expect(policyId).toMatchInlineSnapshot(
				`"0x85ae367dd0501a222f2ef6038f08cafc0c10ba2e85746e4ee15b8d1426ce1954"`,
			);
		});
	});
});
