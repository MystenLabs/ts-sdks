// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients, execSuiTools } from '../../utils/setup.js';

describe('Core API - ZkLogin', () => {
	let toolbox: TestToolbox;
	let validSignatureCase: {
		bytes: string;
		signature: string;
		intentScope: string;
		address: string;
	};
	let validTransactionSignatureCase: {
		bytes: string;
		signature: string;
		intentScope: string;
		address: string;
	};

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();

		const epoch = await toolbox.client.getLatestSuiSystemState();
		const currentEpoch = Number(epoch.epoch);
		const maxEpoch = currentEpoch + 10;

		// Generate PersonalMessage signature
		const pmResult = await execSuiTools([
			'sui',
			'keytool',
			'zk-login-insecure-sign-personal-message',
			'--data',
			'hello',
			'--max-epoch',
			maxEpoch.toString(),
		]);

		const pmOutput = pmResult.stdout;
		const pmSigMatch = pmOutput.match(/│\s*sig\s*│\s*(.+?)\s*│/);
		const pmAddressMatch = pmOutput.match(/│\s*address\s*│\s*(.+?)\s*│/);

		if (!pmSigMatch || !pmAddressMatch) {
			throw new Error('Failed to generate zkLogin signature: could not parse output');
		}

		validSignatureCase = {
			bytes: 'aGVsbG8=', // base64 encoding of "hello"
			signature: pmSigMatch[1].trim(),
			intentScope: 'PersonalMessage',
			address: pmAddressMatch[1].trim(),
		};

		// Hardcoded TransactionData signature (generated using local keytool)
		// This is a valid zkLogin signature for a splitCoins transaction
		validTransactionSignatureCase = {
			bytes:
				'AAACAAjoAwAAAAAAAAAgfSDc2yvKT1COqWE5lGg+tOdunE7TcRaWd8G+AqrwtY4CAgABAQAAAQEDAAAAAAEBAH0g3Nsryk9QjqlhOZRoPrTnbpxO03EWlnfBvgKq8LWOBUnm6NYCf0qet+i4nisG9vPkjBdAUakP9NJaIhxNAW5wAgAAAAAAAAAgjc4NKx5cJeycpGo1XjIgdo1toZHkahb16sgKntvPeAxh3LVlFuS4xJxiN51KIAQiH9PpwS7dGR0/J+0AbbDNIwIAAAAAAAAAIJmxlPz4IL/IpaluZa1eKNW3/u/T8xqaEr3J6GZ4jV+pshWwJBhf8+8bw5dDT3vQVdBwtEIstlaOXbgiRvePOLACAAAAAAAAACDWMaNuPPPGyHTibwrBCk34uaS9aWiC+7xO0gcM+Uat9ue2zqq8tTDxzZbNnJDeZRHmGY9lFw6HOGefh2wYtNK0AgAAAAAAAAAge0lCVJSOyOLBgMvRa3QWF1kIrMOY6AAK1vJUB3WCafT/4jwSJ7T2Qi0qK/YHD14Y/IIiDih9+baf9Z8R+rS+wQIAAAAAAAAAIEg+wcK6KzPOT/mtcW7LF5TDDb65pBDgaAOVPGEqrpv9fSDc2yvKT1COqWE5lGg+tOdunE7TcRaWd8G+AqrwtY7oAwAAAAAAAECrPAAAAAAAAA==',
			signature:
				'BQNNMTAxMjU3MTg5NDg5NTE3ODA1MzAxNDc5MDg0MTQxMjQzNzI1NjkyNDM5MDM5MTYxMDI4OTg5NzgwNzEyMzMzMjE1MjU1MTA5MDQyMjZNMTg5MzMwODkxMDYyMzMxOTQ2NTEwMTAyNzg1Mjg0NTA2OTM1MjkyOTY4NzYwOTAxODQxNDM1MTk5MDMzMDQ3NTcxMDk0NDI3MjQxNzEBMQMCTTE4MjEwNTE3NTgyMjk2Njc2ODEzODc0Mzg1ODQ3OTAyNTQwNDA0MzU3NDY5NTcwOTE5NTI0NjkyMTgyMTIwMjg2MTQzMjk1Mjg3MTUyTDkxNjAwNzI4MzE5NzQzOTIyMTA0MjE4MzU1MTY1MDUyNzUyNDEyMjIzNDI2ODk1MDc4NjgyMzQyMjAwMzE5NDE3MzQyMTY4OTI4ODECTTE1OTk4NzgyODg2MDU2OTIxNDk0NTA3NDYxMDcyNDAxNjQ0MjY1Nzc4OTgwMjg2MDk2OTEzOTU2NjIyMzE3MTkxNDM1NjU0NjQxODQ3TTEyNTE1OTg1MzExMDcwNTM0OTgxMjgyNTM1NzI5NDYxNTA1NTY0NDIwODQ4NTE3ODQ2Nzc3NDM3MDUxODkzMzkyMDc2MzIyMTg5MDA3AgExATADTDkwODQyOTczNTg1MzM2MTM2NzAwNTYzNTIyOTA4NzQwNzE1NDM5NjA4Mzk3ODM3NTY0NjEyNjAxNjUzODIwMTc3NDYyOTE2MjQ5OTVMMjI2ODgxMzgxODAzMTcyNDAwNjE2NzE2NDU4OTgyMTIxOTYzOTE3MzQ1MTQ2ODk1Mzg4Nzk0NjAxNDI2MDgxODA4NDQ5MzIxNjI3NQExKHdpYVhOeklqb2lhSFIwY0hNNkx5OXZZWFYwYUM1emRXa3VhVzhpTEMCPmV5SnJhV1FpT2lKemRXa3RhMlY1TFdsa0lpd2lkSGx3SWpvaVNsZFVJaXdpWVd4bklqb2lVbE15TlRZaWZRTTIwNDM1MzY2NjAwMDM2Mzc1NzQ1OTI1OTYzNDU2ODYxMzA3OTI1MjA5NDcwMjE5MzM0MDE4NTY0MTU4MTQ4NTQ0MDM2MTk2Mjg0NjQyCgAAAAAAAABhAJLFfkmhnjOADZ8013Wq0iX+U5arCckvpFEnX3RrGrEXTrpLOKpuVChDGqIAF+1qmyIcGqzCTE5HEsrxOLjwFg+5xu4WMO8+cRFEpkjbBruyKE9ydM++5T/87lA8waSSAA==',
			intentScope: 'TransactionData',
			address: '0xc0f0d0e2a2ca8b8d0e4055ec48210ec77d055db353402cda01d7085ba61d3d5c',
		};
	});

	describe('verifyZkLoginSignature - PersonalMessage', () => {
		testWithAllClients('should verify valid zkLogin signature', async (client) => {
			const result = await client.core.verifyZkLoginSignature(validSignatureCase as any);

			expect(result).toBeDefined();
			expect(result).toHaveProperty('success');
			expect(result).toHaveProperty('errors');
			expect(typeof result.success).toBe('boolean');
			expect(Array.isArray(result.errors)).toBe(true);

			expect(result.success).toBe(true);
			expect(result.errors).toEqual([]);
		});

		testWithAllClients('should fail verification for wrong author', async (client) => {
			const wrongAuthorCase = {
				...validSignatureCase,
				address: '0x0000000000000000000000000000000000000000000000000000000000000000',
			};

			const result = await client.core.verifyZkLoginSignature(wrongAuthorCase as any);

			expect(result.success).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		testWithAllClients('should fail verification for wrong bytes', async (client) => {
			const wrongBytesCase = {
				...validSignatureCase,
				bytes: 'd29ybGQ=', // base64 encoding of "world" instead of "hello"
			};

			const result = await client.core.verifyZkLoginSignature(wrongBytesCase as any);

			expect(result.success).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});

	describe('verifyZkLoginSignature - TransactionData', () => {
		testWithAllClients('should verify valid zkLogin transaction signature', async (client) => {
			const result = await client.core.verifyZkLoginSignature(validTransactionSignatureCase as any);

			expect(result).toBeDefined();
			expect(result).toHaveProperty('success');
			expect(result).toHaveProperty('errors');
			expect(typeof result.success).toBe('boolean');
			expect(Array.isArray(result.errors)).toBe(true);

			expect(result.success).toBe(true);
			expect(result.errors).toEqual([]);
		});

		testWithAllClients(
			'should fail verification for wrong author on transaction',
			async (client) => {
				const wrongAuthorCase = {
					...validTransactionSignatureCase,
					address: '0x0000000000000000000000000000000000000000000000000000000000000000',
				};

				const result = await client.core.verifyZkLoginSignature(wrongAuthorCase as any);

				expect(result.success).toBe(false);
				expect(result.errors.length).toBeGreaterThan(0);
			},
		);
	});
});
