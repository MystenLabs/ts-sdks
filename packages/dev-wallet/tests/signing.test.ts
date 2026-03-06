// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

import { executeSigning } from '../src/wallet/signing.js';

describe('executeSigning', () => {
	const signer = new Ed25519Keypair();

	describe('sign-personal-message', () => {
		it('signs a personal message', async () => {
			const data = new Uint8Array([1, 2, 3]);
			const result = await executeSigning({
				type: 'sign-personal-message',
				signer,
				data,
			});
			expect(result.type).toBe('sign-personal-message');
			expect(result.bytes).toBeDefined();
			expect(result.signature).toBeDefined();
		});

		it('rejects non-Uint8Array data', async () => {
			await expect(
				executeSigning({
					type: 'sign-personal-message',
					signer,
					data: 'not-a-uint8array',
				}),
			).rejects.toThrow('sign-personal-message expects data to be a Uint8Array');
		});
	});

	describe('sign-transaction', () => {
		it('signs a transaction when Transaction.from and tx.sign succeed', async () => {
			const mockTxBytes = 'dHhCeXRlcw=='; // base64 of "txBytes"
			const mockSignature = 'mockSig123';

			const { Transaction } = await import('@mysten/sui/transactions');
			const origFrom = Transaction.from;
			Transaction.from = vi.fn().mockReturnValue({
				sign: vi.fn().mockResolvedValue({ bytes: mockTxBytes, signature: mockSignature }),
			});

			try {
				const client = { core: {} } as any;
				const result = await executeSigning({
					type: 'sign-transaction',
					signer,
					data: '{"kind":"TransactionData"}',
					client,
				});

				expect(result.type).toBe('sign-transaction');
				expect(result.bytes).toBe(mockTxBytes);
				expect(result.signature).toBe(mockSignature);
			} finally {
				Transaction.from = origFrom;
			}
		});

		it('rejects non-string data', async () => {
			const client = { core: {} } as any;
			await expect(
				executeSigning({
					type: 'sign-transaction',
					signer,
					data: new Uint8Array([1, 2, 3]),
					client,
				}),
			).rejects.toThrow('sign-transaction expects data to be a JSON string');
		});

		it('rejects without client', async () => {
			await expect(
				executeSigning({
					type: 'sign-transaction',
					signer,
					data: '{}',
				}),
			).rejects.toThrow('No client provided');
		});
	});

	describe('sign-and-execute-transaction', () => {
		it('signs and executes a transaction successfully', async () => {
			const mockTxBytes = 'dHhCeXRlcw==';
			const mockSignature = 'mockSig456';
			const mockDigest = 'ABC123';
			const mockEffectsBcs = new Uint8Array([0xef, 0xfe, 0xc7]);

			const { Transaction } = await import('@mysten/sui/transactions');
			const origFrom = Transaction.from;
			Transaction.from = vi.fn().mockReturnValue({
				sign: vi.fn().mockResolvedValue({ bytes: mockTxBytes, signature: mockSignature }),
			});

			try {
				const client = {
					core: {
						executeTransaction: vi.fn().mockResolvedValue({
							Transaction: {
								digest: mockDigest,
								status: { success: true },
								effects: { bcs: mockEffectsBcs },
							},
						}),
					},
				} as any;

				const result = await executeSigning({
					type: 'sign-and-execute-transaction',
					signer,
					data: '{"kind":"TransactionData"}',
					client,
				});

				expect(result.type).toBe('sign-and-execute-transaction');
				if (result.type === 'sign-and-execute-transaction') {
					expect(result.bytes).toBe(mockTxBytes);
					expect(result.signature).toBe(mockSignature);
					expect(result.digest).toBe(mockDigest);
					expect(result.effects).toBeTruthy();
				}
			} finally {
				Transaction.from = origFrom;
			}
		});

		it('throws when transaction execution fails', async () => {
			// Valid base64 string so fromBase64 doesn't fail before reaching executeTransaction
			const validBase64 = 'dHhEYXRh';

			const { Transaction } = await import('@mysten/sui/transactions');
			const origFrom = Transaction.from;
			Transaction.from = vi.fn().mockReturnValue({
				sign: vi.fn().mockResolvedValue({ bytes: validBase64, signature: 'sig' }),
			});

			try {
				const client = {
					core: {
						executeTransaction: vi.fn().mockResolvedValue({
							FailedTransaction: {
								digest: 'FAIL123',
								status: { success: false, error: { message: 'Out of gas' } },
								effects: null,
							},
						}),
					},
				} as any;

				await expect(
					executeSigning({
						type: 'sign-and-execute-transaction',
						signer,
						data: '{}',
						client,
					}),
				).rejects.toThrow('Out of gas');
			} finally {
				Transaction.from = origFrom;
			}
		});

		it('returns empty effects string when effects BCS is missing', async () => {
			const validBase64 = 'dHhEYXRh';

			const { Transaction } = await import('@mysten/sui/transactions');
			const origFrom = Transaction.from;
			Transaction.from = vi.fn().mockReturnValue({
				sign: vi.fn().mockResolvedValue({ bytes: validBase64, signature: 'sig' }),
			});

			try {
				const client = {
					core: {
						executeTransaction: vi.fn().mockResolvedValue({
							Transaction: {
								digest: 'DIG1',
								status: { success: true },
								effects: null,
							},
						}),
					},
				} as any;

				const result = await executeSigning({
					type: 'sign-and-execute-transaction',
					signer,
					data: '{}',
					client,
				});

				if (result.type === 'sign-and-execute-transaction') {
					expect(result.effects).toBe('');
				}
			} finally {
				Transaction.from = origFrom;
			}
		});

		it('throws when execution returns empty result', async () => {
			const validBase64 = 'dHhEYXRh';

			const { Transaction } = await import('@mysten/sui/transactions');
			const origFrom = Transaction.from;
			Transaction.from = vi.fn().mockReturnValue({
				sign: vi.fn().mockResolvedValue({ bytes: validBase64, signature: 'sig' }),
			});

			try {
				const client = {
					core: {
						executeTransaction: vi.fn().mockResolvedValue({}),
					},
				} as any;

				await expect(
					executeSigning({
						type: 'sign-and-execute-transaction',
						signer,
						data: '{}',
						client,
					}),
				).rejects.toThrow('empty result');
			} finally {
				Transaction.from = origFrom;
			}
		});

		it('rejects non-string data', async () => {
			const client = { core: {} } as any;
			await expect(
				executeSigning({
					type: 'sign-and-execute-transaction',
					signer,
					data: 123 as any,
					client,
				}),
			).rejects.toThrow('sign-and-execute-transaction expects data to be a JSON string');
		});

		it('rejects without client', async () => {
			await expect(
				executeSigning({
					type: 'sign-and-execute-transaction',
					signer,
					data: '{}',
				}),
			).rejects.toThrow('No client provided');
		});
	});
});
