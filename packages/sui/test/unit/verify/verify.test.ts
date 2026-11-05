// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import { toBase64 } from '@mysten/bcs';
import { describe, expect, it, vi } from 'vitest';

import type { ClientWithCoreApi } from '../../../src/client/core.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { GrpcCoreClient } from '../../../src/grpc/core.js';
import { BadRequest } from '../../../src/grpc/proto/google/rpc/error_details.js';
import { Status } from '../../../src/grpc/proto/google/rpc/status.js';
import type { SuiGrpcClient } from '../../../src/grpc/client.js';
import { Ed25519Keypair } from '../../../src/keypairs/ed25519/index.js';
import {
	isValidPersonalMessageSignature,
	isValidSignature,
	verifyPersonalMessageSignature,
	verifySignature,
	verifyTransactionSignature,
} from '../../../src/verify/index.js';

// A well-formed zkLogin signature.
const zkLoginSig =
	'BQNNMTczMTgwODkxMjU5NTI0MjE3MzYzNDIyNjM3MTc5MzI3MTk0Mzc3MTc4NDQyODI0MTAxODc5NTc5ODQ3NTE5Mzk5NDI4OTgyNTEyNTBNMTEzNzM5NjY2NDU0NjkxMjI1ODIwNzQwODIyOTU5ODUzODgyNTg4NDA2ODE2MTgyNjg1OTM5NzY2OTczMjU4OTIyODA5MTU2ODEyMDcBMQMCTDU5Mzk4NzExNDczNDg4MzQ5OTczNjE3MjAxMjIyMzg5ODAxNzcxNTIzMDMyNzQzMTEwNDcyNDk5MDU5NDIzODQ5MTU3Njg2OTA4OTVMNDUzMzU2ODI3MTEzNDc4NTI3ODczMTIzNDU3MDM2MTQ4MjY1MTk5Njc0MDc5MTg4ODI4NTg2NDk2Njg4NDAzMjcxNzA0OTgxMTcwOAJNMTA1NjQzODcyODUwNzE1NTU0Njk3NTM5OTA2NjE0MTA4NDAxMTg2MzU5MjU0NjY1OTcwMzcwMTgwNTg3NzAwNDEzNDc1MTg0NjEzNjhNMTI1OTczMjM1NDcyNzc1NzkxNDQ2OTg0OTYzNzIyNDI2MTUzNjgwODU4MDEzMTMzNDMxNTU3MzU1MTEzMzAwMDM4ODQ3Njc5NTc4NTQCATEBMANNMTU3OTE1ODk0NzI1NTY4MjYyNjMyMzE2NDQ3Mjg4NzMzMzc2MjkwMTUyNjk5ODQ2OTk0MDQwNzM2MjM2MDMzNTI1Mzc2Nzg4MTMxNzFMNDU0Nzg2NjQ5OTI0ODg4MTQ0OTY3NjE2MTE1ODAyNDc0ODA2MDQ4NTM3MzI1MDAyOTQyMzkwNDExMzAxNzQyMjUzOTAzNzE2MjUyNwExMXdpYVhOeklqb2lhSFIwY0hNNkx5OXBaQzUwZDJsMFkyZ3VkSFl2YjJGMWRHZ3lJaXcCMmV5SmhiR2NpT2lKU1V6STFOaUlzSW5SNWNDSTZJa3BYVkNJc0ltdHBaQ0k2SWpFaWZRTTIwNzk0Nzg4NTU5NjIwNjY5NTk2MjA2NDU3MDIyOTY2MTc2OTg2Njg4NzI3ODc2MTI4MjIzNjI4MTEzOTE2MzgwOTI3NTAyNzM3OTExCgAAAAAAAABhABHpkQ5JvxqbqCKtqh9M0U5c3o3l62B6ALVOxMq6nsc0y3JlY8Gf1ZoPA976dom6y3JGBUTsry6axfqHcVrtRAy5xu4WMO8+cRFEpkjbBruyKE9ydM++5T/87lA8waSSAA==';

const message = new TextEncoder().encode('hello');

function mockClient(response: { valid: boolean; reason?: string } = { valid: true }) {
	const verifySignature = vi.fn().mockResolvedValue(response);
	const client = { core: { verifySignature } } as unknown as ClientWithCoreApi;
	return { client, verifySignature };
}

describe('verify helpers', () => {
	it('require a client or offline: true', async () => {
		const { signature } = await new Ed25519Keypair().signPersonalMessage(message);

		// @ts-expect-error a client or offline: true is required
		await expect(verifyPersonalMessageSignature(message, signature, {})).rejects.toThrow(
			'Pass a client to verify signatures, or `offline: true`',
		);
		// @ts-expect-error offline verification can't check address aliases
		await verifyPersonalMessageSignature(message, signature, {
			offline: true,
			checkAddressAliases: true,
		}).catch(() => {});
		// @ts-expect-error raw bytes are only verified offline
		await expect(isValidSignature(message, signature, mockClient())).rejects.toThrow(
			'can only be verified offline',
		);
	});

	it('verifies on the node with address and checkAddressAliases', async () => {
		const keypair = new Ed25519Keypair();
		const owner = new Ed25519Keypair().toSuiAddress();
		const { signature } = await keypair.signPersonalMessage(message);
		const { client, verifySignature: core } = mockClient();

		const publicKey = await verifyPersonalMessageSignature(message, signature, {
			client,
			address: owner,
		});

		// The returned key is the signer's, which may be one of the address's aliases.
		expect(publicKey.toSuiAddress()).toBe(keypair.toSuiAddress());
		expect(core).toHaveBeenCalledWith({
			personalMessage: message,
			signature,
			address: owner,
			checkAddressAliases: undefined,
		});

		await verifyPersonalMessageSignature(message, signature, {
			client,
			address: owner,
			checkAddressAliases: false,
		});
		expect(core).toHaveBeenLastCalledWith(expect.objectContaining({ checkAddressAliases: false }));
	});

	it('reports an invalid signature from the node', async () => {
		const { signature } = await new Ed25519Keypair().signTransaction(message);
		const { client } = mockClient({ valid: false, reason: 'not an alias' });
		const options = { client, address: new Ed25519Keypair().toSuiAddress() };

		await expect(verifyTransactionSignature(message, signature, options)).rejects.toThrow(
			'Signature is not valid for the provided Transaction: not an alias',
		);
		expect(await isValidPersonalMessageSignature(message, signature, options)).toBe(false);
	});

	it('propagates node errors from isValid helpers', async () => {
		const { signature } = await new Ed25519Keypair().signPersonalMessage(message);
		const client = {
			core: { verifySignature: vi.fn().mockRejectedValue(new Error('network down')) },
		} as unknown as ClientWithCoreApi;

		await expect(isValidPersonalMessageSignature(message, signature, { client })).rejects.toThrow(
			'network down',
		);
	});

	it('checks the signer against address offline', async () => {
		const keypair = new Ed25519Keypair();
		const { signature } = await keypair.signPersonalMessage(message);
		const other = new Ed25519Keypair().toSuiAddress();

		expect(
			await isValidPersonalMessageSignature(message, signature, {
				offline: true,
				address: keypair.toSuiAddress(),
			}),
		).toBe(true);
		expect(
			await isValidPersonalMessageSignature(message, signature, { offline: true, address: other }),
		).toBe(false);
		await expect(
			verifySignature(message, signature, { offline: true, address: other }),
		).rejects.toThrow('Signature is not valid');
	});

	it('throws for zkLogin offline', async () => {
		await expect(
			isValidPersonalMessageSignature(message, zkLoginSig, { offline: true }),
		).rejects.toThrow("zkLogin signatures can't be verified offline");
	});

	it('UTF-8 encode a string personal message, offline and on the node', async () => {
		const keypair = new Ed25519Keypair();
		const text = 'Sign in to example.com ✓';
		const { signature } = await keypair.signPersonalMessage(new TextEncoder().encode(text));
		const address = keypair.toSuiAddress();

		expect(
			(
				await verifyPersonalMessageSignature(text, signature, { offline: true, address })
			).toSuiAddress(),
		).toBe(address);
		expect(await isValidPersonalMessageSignature(text, signature, { offline: true, address })).toBe(
			true,
		);
		expect(
			await isValidPersonalMessageSignature('another message', signature, { offline: true }),
		).toBe(false);

		const { client, verifySignature: core } = mockClient();
		await verifyPersonalMessageSignature(text, signature, { client, address });
		expect(core.mock.calls[0][0].personalMessage).toEqual(new TextEncoder().encode(text));
	});
});

describe('GrpcCoreClient.verifySignature', () => {
	function grpcCore(response: Record<string, unknown>) {
		const client = {
			signatureVerificationService: { verifySignature: vi.fn().mockResolvedValue({ response }) },
		} as unknown as SuiGrpcClient;
		return new GrpcCoreClient({ client, base: client, network: 'localnet' });
	}
	const options = { personalMessage: 'hello', signature: 'AA==', address: '0x1' };

	it('checks aliases by default', async () => {
		const verifySignature = vi.fn().mockResolvedValue({ response: { isValid: true } });
		const client = {
			signatureVerificationService: { verifySignature },
		} as unknown as SuiGrpcClient;
		const core = new GrpcCoreClient({ client, base: client, network: 'localnet' });
		expect(await core.verifySignature(options)).toEqual({ valid: true });
		expect(await core.verifySignature({ ...options, checkAddressAliases: false })).toEqual({
			valid: true,
		});
		expect(verifySignature.mock.calls.map(([request]) => request.checkAddressAliases)).toEqual([
			true,
			false,
		]);
	});

	it('maps an invalid signature', async () => {
		expect(
			await grpcCore({ isValid: false, reason: 'bad' }).verifySignature({
				...options,
				address: undefined,
			}),
		).toEqual({
			valid: false,
			reason: 'bad',
		});
	});

	// Captured from a localnet `VerifySignature` call with a 3-byte signature.
	const SIGNATURE_VIOLATION =
		'CAMSfmludmFsaWQgc2lnbmF0dXJlOiBlcnJvciBjb252ZXJ0aW5nIGZyb20gcHJvdG9idWY6IGZpZWxkOiBiY3MgcmVhc29uOiBGSUVMRF9JTlZBTElEIGRlc2NyaXB0aW9uOiBtaXNzaW5nIHNpZ25hdHVyZSBzY2hlbWUgZmxhZxq4AQoWL2dvb2dsZS5ycGMuQmFkUmVxdWVzdBKdAQqaAQoJc2lnbmF0dXJlEn5pbnZhbGlkIHNpZ25hdHVyZTogZXJyb3IgY29udmVydGluZyBmcm9tIHByb3RvYnVmOiBmaWVsZDogYmNzIHJlYXNvbjogRklFTERfSU5WQUxJRCBkZXNjcmlwdGlvbjogbWlzc2luZyBzaWduYXR1cmUgc2NoZW1lIGZsYWcaDUZJRUxEX0lOVkFMSUQ';
	const MESSAGE_VIOLATION = base64Status(
		BadRequest.toBinary({
			fieldViolations: [
				{ field: 'message', description: 'invalid signature: not BCS', reason: 'FIELD_INVALID' },
			],
		}),
	);

	function base64Status(badRequest: Uint8Array) {
		return toBase64(
			Status.toBinary({
				code: 3,
				message: 'rejected',
				details: [{ typeUrl: '/google.rpc.BadRequest', value: badRequest }],
			}),
		);
	}

	function rejecting(message: string, details?: string) {
		const meta: Record<string, string> = details ? { 'grpc-status-details-bin': details } : {};
		const verifySignature = vi
			.fn()
			.mockRejectedValue(new RpcError(message, 'INVALID_ARGUMENT', meta));
		const client = {
			signatureVerificationService: { verifySignature },
		} as unknown as SuiGrpcClient;
		return new GrpcCoreClient({ client, base: client, network: 'localnet' });
	}

	it('reports a signature field violation as an invalid signature', async () => {
		expect(await rejecting('anything', SIGNATURE_VIOLATION).verifySignature(options)).toEqual({
			valid: false,
			reason:
				'invalid signature: error converting from protobuf: field: bcs reason: FIELD_INVALID description: missing signature scheme flag',
		});
		expect(await grpcCore({}).verifySignature({ ...options, signature: 'not base64!' })).toEqual({
			valid: false,
			reason: 'Cannot parse signature',
		});
	});

	it.each([
		['a violation of another field', MESSAGE_VIOLATION],
		['status text alone', undefined],
	])('throws for %s', async (_, details) => {
		await expect(
			rejecting('invalid signature: bad length', details).verifySignature(options),
		).rejects.toThrow('invalid signature: bad length');
	});
});

describe('verifySignature without a verdict', () => {
	const options = { personalMessage: 'hello', signature: 'AA==', address: '0x1' };

	it('throws on gRPC when the response has no isValid', async () => {
		const client = {
			signatureVerificationService: {
				verifySignature: vi.fn().mockResolvedValue({ response: {} }),
			},
		} as unknown as SuiGrpcClient;
		const core = new GrpcCoreClient({ client, base: client, network: 'localnet' });
		await expect(core.verifySignature(options)).rejects.toThrow('verdict');
	});

	it('throws on GraphQL when verifySignature is null', async () => {
		const client = new SuiGraphQLClient({ network: 'localnet', url: 'http://localhost' });
		client.query = vi.fn(async () => ({ data: { verifySignature: null } })) as never;
		await expect(client.core.verifySignature(options)).rejects.toThrow('verdict');
	});
});

describe('GraphQLCoreClient.verifySignature errors', () => {
	const options = { personalMessage: 'hello', signature: 'AA==', address: '0x1' };

	function rejecting(message: string) {
		const client = new SuiGraphQLClient({ network: 'localnet', url: 'http://localhost' });
		client.query = vi.fn(async () => ({
			data: { verifySignature: null },
			errors: [{ message, path: ['verifySignature'], locations: [], extensions: {} }],
		})) as never;
		return client.core;
	}

	it.each([
		'Verification failed: NotAnAlias',
		'Verification failed: Invalid signature',
		'Cannot parse signature',
	])('reports %s as an invalid signature', async (message) => {
		expect(await rejecting(message).verifySignature(options)).toEqual({
			valid: false,
			reason: message,
		});
	});

	it('throws for any other error on the field', async () => {
		await expect(
			rejecting('Failed to deserialize TransactionData from bytes').verifySignature(options),
		).rejects.toThrow('Failed to deserialize TransactionData from bytes');
	});
});
