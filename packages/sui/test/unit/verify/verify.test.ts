// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import { describe, expect, it, vi } from 'vitest';

import type { ClientWithCoreApi } from '../../../src/client/core.js';
import { GrpcCoreClient } from '../../../src/grpc/core.js';
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
});

describe('GrpcCoreClient.verifySignature', () => {
	function grpcCore(response: Record<string, unknown>) {
		const client = {
			signatureVerificationService: { verifySignature: vi.fn().mockResolvedValue({ response }) },
		} as unknown as SuiGrpcClient;
		return new GrpcCoreClient({ client, base: client, network: 'localnet' });
	}
	const options = { personalMessage: 'hello', signature: 'AA==', address: '0x1' };

	it('checks aliases by default and throws when the node did not apply the check', async () => {
		const core = grpcCore({ isValid: true });
		await expect(core.verifySignature(options)).rejects.toThrow(
			'The node did not apply the address alias check',
		);
		expect(
			await grpcCore({ isValid: true, addressAliasesChecked: true }).verifySignature(options),
		).toEqual({ valid: true });
		expect(await core.verifySignature({ ...options, checkAddressAliases: false })).toEqual({
			valid: true,
		});
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

	it('reports a signature the node or client cannot parse as invalid', async () => {
		function rejecting(message: string) {
			const verifySignature = vi.fn().mockRejectedValue(new RpcError(message, 'INVALID_ARGUMENT'));
			const client = {
				signatureVerificationService: { verifySignature },
			} as unknown as SuiGrpcClient;
			return new GrpcCoreClient({ client, base: client, network: 'localnet' });
		}

		expect(await rejecting('invalid signature: bad length').verifySignature(options)).toEqual({
			valid: false,
			reason: 'invalid signature: bad length',
		});
		expect(await grpcCore({}).verifySignature({ ...options, signature: 'not base64!' })).toEqual({
			valid: false,
			reason: 'Cannot parse signature',
		});
		await expect(rejecting('invalid message').verifySignature(options)).rejects.toThrow(
			'invalid message',
		);
	});
});
