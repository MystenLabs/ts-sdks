// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, type Mock, vi } from 'vitest';

import {
	WalletFeatureNotSupportedError,
	WalletNotConnectedError,
} from '../../src/errors/walletErrors.js';
import { useConnectWallet, useSignAndExecuteTransaction } from '../../src/index.js';
import { suiFeatures } from '../mocks/mockFeatures.js';
import { createWalletProviderContextWrapper, registerMockWallet } from '../test-utils.js';
import { toBase58 } from '@mysten/utils';

describe('useSignAndExecuteTransaction', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	test('throws an error when trying to sign and execute a transaction without a wallet connection', async () => {
		const wrapper = createWalletProviderContextWrapper();
		const { result } = renderHook(() => useSignAndExecuteTransaction(), { wrapper });

		result.current.mutate({ transaction: new Transaction(), chain: 'sui:testnet' });

		await waitFor(() => expect(result.current.error).toBeInstanceOf(WalletNotConnectedError));
	});

	test('throws an error when trying to sign and execute a transaction with a wallet that lacks feature support', async () => {
		const { unregister, mockWallet } = registerMockWallet({
			walletName: 'Mock Wallet 1',
		});

		const wrapper = createWalletProviderContextWrapper();
		const { result } = renderHook(
			() => ({
				connectWallet: useConnectWallet(),
				useSignAndExecuteTransaction: useSignAndExecuteTransaction(),
			}),
			{ wrapper },
		);

		result.current.connectWallet.mutate({ wallet: mockWallet });
		await waitFor(() => expect(result.current.connectWallet.isSuccess).toBe(true));

		result.current.useSignAndExecuteTransaction.mutate({
			transaction: new Transaction(),
			chain: 'sui:testnet',
		});
		await waitFor(() =>
			expect(result.current.useSignAndExecuteTransaction.error).toBeInstanceOf(
				WalletFeatureNotSupportedError,
			),
		);

		act(() => unregister());
	});

	test('signing and executing a transaction from the currently connected account works successfully', async () => {
		const { unregister, mockWallet } = registerMockWallet({
			walletName: 'Mock Wallet 1',
			features: suiFeatures,
		});

		const suiClient = new SuiJsonRpcClient({
			url: getJsonRpcFullnodeUrl('localnet'),
			network: 'localnet',
		});
		const mockSignTransactionFeature = mockWallet.features['sui:signTransaction'];
		const signTransaction = mockSignTransactionFeature!.signTransaction as Mock;

		signTransaction.mockReturnValueOnce({
			bytes: 'abc',
			signature: '123',
		});

		const executeTransaction = vi.spyOn(suiClient, 'executeTransactionBlock');

		executeTransaction.mockResolvedValueOnce({
			digest: '123',
			rawEffects: [10, 20, 30],
		});

		const wrapper = createWalletProviderContextWrapper({}, suiClient);
		const { result } = renderHook(
			() => ({
				connectWallet: useConnectWallet(),
				useSignAndExecuteTransaction: useSignAndExecuteTransaction(),
			}),
			{ wrapper },
		);

		result.current.connectWallet.mutate({ wallet: mockWallet });

		await waitFor(() => expect(result.current.connectWallet.isSuccess).toBe(true));

		result.current.useSignAndExecuteTransaction.mutate({
			transaction: new Transaction(),
			chain: 'sui:testnet',
		});

		await waitFor(() => expect(result.current.useSignAndExecuteTransaction.isSuccess).toBe(true));
		expect(result.current.useSignAndExecuteTransaction.data).toStrictEqual({
			bytes: 'abc',
			digest: '123',
			effects: 'ChQe',
			signature: '123',
			rawEffects: [10, 20, 30],
		});

		const call = signTransaction.mock.calls[0];

		expect(call[0].account).toStrictEqual(mockWallet.accounts[0]);
		expect(call[0].chain).toBe('sui:testnet');
		const expectedTransaction = new Transaction();
		expectedTransaction.setSenderIfNotSet(mockWallet.accounts[0].address);
		expect(await call[0].transaction.toJSON()).toEqual(await expectedTransaction.toJSON());

		act(() => unregister());
	});

	test('defaults the `chain` to the active network', async () => {
		const { unregister, mockWallet } = registerMockWallet({
			walletName: 'Mock Wallet 1',
			features: suiFeatures,
		});

		const mockSignTransactionFeature = mockWallet.features['sui:signTransaction'];
		const signTransaction = mockSignTransactionFeature!.signTransaction as Mock;
		signTransaction.mockReturnValueOnce({
			bytes: 'abc',
			signature: '123',
		});

		const suiClient = new SuiJsonRpcClient({
			url: getJsonRpcFullnodeUrl('localnet'),
			network: 'localnet',
		});
		const executeTransaction = vi.spyOn(suiClient, 'executeTransactionBlock');
		executeTransaction.mockResolvedValueOnce({
			digest: '123',
			rawEffects: [10, 20, 30],
		});

		const wrapper = createWalletProviderContextWrapper({}, suiClient);
		const { result } = renderHook(
			() => ({
				connectWallet: useConnectWallet(),
				useSignAndExecuteTransaction: useSignAndExecuteTransaction(),
			}),
			{ wrapper },
		);

		result.current.connectWallet.mutate({ wallet: mockWallet });
		await waitFor(() => expect(result.current.connectWallet.isSuccess).toBe(true));

		result.current.useSignAndExecuteTransaction.mutate({
			transaction: new Transaction(),
		});

		await waitFor(() => expect(result.current.useSignAndExecuteTransaction.isSuccess).toBe(true));

		expect(signTransaction).toHaveBeenCalledWith({
			transaction: expect.any(Object),
			chain: 'sui:test',
			account: mockWallet.accounts[0],
		});

		act(() => unregister());
	});

	test('executing with custom data resolver', async () => {
		const { unregister, mockWallet } = registerMockWallet({
			walletName: 'Mock Wallet 1',
			features: suiFeatures,
		});

		const suiClient = new SuiJsonRpcClient({
			url: getJsonRpcFullnodeUrl('localnet'),
			network: 'localnet',
		});
		const mockSignMessageFeature = mockWallet.features['sui:signTransaction'];
		const signTransaction = mockSignMessageFeature!.signTransaction as Mock;

		signTransaction.mockReturnValueOnce({
			bytes: 'abc',
			signature: '123',
		});

		const wrapper = createWalletProviderContextWrapper({}, suiClient);

		const fakeDigest = toBase58(
			new Uint8Array([
				1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1,
				2,
			]),
		);
		const effectsBcs = bcs.TransactionEffects.serialize({
			V2: {
				status: {
					Success: true,
				},
				executedEpoch: 1,
				gasUsed: {
					computationCost: 1,
					storageCost: 1,
					storageRebate: 1,
					nonRefundableStorageFee: 1,
				},
				transactionDigest: fakeDigest,
				gasObjectIndex: 0,
				eventsDigest: fakeDigest,
				dependencies: [],
				lamportVersion: 1,
				changedObjects: [],
				unchangedSharedObjects: [],
				auxDataDigest: fakeDigest,
			},
		}).toBase64();
		const { result } = renderHook(
			() => ({
				connectWallet: useConnectWallet(),
				useSignAndExecuteTransaction: useSignAndExecuteTransaction({
					execute: async () => ({
						custom: 123,
						effects: {
							bcs: effectsBcs,
						},
					}),
				}),
			}),
			{ wrapper },
		);

		result.current.connectWallet.mutate({ wallet: mockWallet });

		await waitFor(() => expect(result.current.connectWallet.isSuccess).toBe(true));

		const signTransactionFeature = mockWallet.features['sui:signTransaction'];
		const signTransactionMock = signTransactionFeature!.signTransaction as Mock;

		signTransactionMock.mockReturnValueOnce({
			transactionBytes: 'abc',
			signature: '123',
		});

		result.current.useSignAndExecuteTransaction.mutate({
			transaction: new Transaction(),
			chain: 'sui:testnet',
		});

		await waitFor(() => expect(result.current.useSignAndExecuteTransaction.isSuccess).toBe(true));
		expect(result.current.useSignAndExecuteTransaction.data).toStrictEqual({
			effects: {
				bcs: effectsBcs,
			},
			custom: 123,
		});
		expect(result.current.useSignAndExecuteTransaction.data?.custom).toBe(123);

		const call = signTransaction.mock.calls[0];

		expect(call[0].account).toStrictEqual(mockWallet.accounts[0]);
		expect(call[0].chain).toBe('sui:testnet');
		const expectedTransaction = new Transaction();
		expectedTransaction.setSenderIfNotSet(mockWallet.accounts[0].address);
		expect(await call[0].transaction.toJSON()).toEqual(await expectedTransaction.toJSON());

		act(() => unregister());
	});
});
