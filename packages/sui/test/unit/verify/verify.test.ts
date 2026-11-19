// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase64 } from '@mysten/bcs';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import type { ClientWithCoreApi } from '../../../src/client/core.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { GrpcCoreClient } from '../../../src/grpc/core.js';
import type { SuiGrpcClient } from '../../../src/grpc/client.js';
import { toSerializedSignature } from '../../../src/cryptography/index.js';
import { Ed25519Keypair } from '../../../src/keypairs/ed25519/index.js';
import { MultiSigPublicKey } from '../../../src/multisig/index.js';
import { parseSerializedZkLoginSignature } from '../../../src/zklogin/publickey.js';
import {
	isValidPersonalMessageSignature,
	isValidSignature,
	isValidTransactionSignature,
	publicKeyFromRawBytes,
	verifyPersonalMessageSignature,
	verifySignature,
	verifyTransactionSignature,
} from '../../../src/verify/index.js';
import type { VerifyOptions } from '../../../src/verify/index.js';
import { zkLoginSignature } from '../fixtures/zklogin-signature.js';

const message = new TextEncoder().encode('hello');
const transaction = bcs.TransactionData.serialize({
	V1: {
		kind: { ProgrammableTransaction: { inputs: [], commands: [] } },
		sender: '0x1',
		gasData: { payment: [], owner: '0x1', price: '1', budget: '1' },
		expiration: { None: true },
	},
}).toBytes();

function mockClient(response: { valid: boolean; reason?: string } = { valid: true }) {
	const verifySignature = vi.fn().mockResolvedValue(response);
	const client = { core: { verifySignature } } as unknown as ClientWithCoreApi;
	return { client, verifySignature };
}

function grpcCoreWith(verifySignature: ReturnType<typeof vi.fn>) {
	const client = { signatureVerificationService: { verifySignature } } as unknown as SuiGrpcClient;
	return new GrpcCoreClient({ client, base: client, network: 'localnet' });
}

function grpcCore(response: Record<string, unknown>) {
	return grpcCoreWith(vi.fn().mockResolvedValue({ response }));
}

function graphqlCoreWith(query: ReturnType<typeof vi.fn>) {
	const client = new SuiGraphQLClient({ network: 'localnet', url: 'http://localhost' });
	client.query = query as never;
	return client.core;
}

function graphqlCore(result: Record<string, unknown>) {
	return graphqlCoreWith(vi.fn().mockResolvedValue(result));
}

describe('verify helpers', () => {
	it('require a client or offline: true (type only)', () => {
		// @ts-expect-error a client or offline: true is required
		const options: VerifyOptions = {};
		expect(options).toEqual({});
	});

	it('does not accept checkAddressAliases offline (type only)', () => {
		const options: VerifyOptions = {
			offline: true,
			// @ts-expect-error offline verification can't check address aliases
			checkAddressAliases: true,
		};
		expect(options.offline).toBe(true);
	});

	it('verify raw bytes locally without options, as in 2.x', async () => {
		const keypair = new Ed25519Keypair();
		const signature = toSerializedSignature({
			signature: await keypair.sign(message),
			signatureScheme: 'ED25519',
			publicKey: keypair.getPublicKey(),
		});

		expect(await isValidSignature(message, signature)).toBe(true);
		expect((await verifySignature(message, signature)).toSuiAddress()).toBe(keypair.toSuiAddress());
		expect(
			await isValidSignature(message, signature, { address: new Ed25519Keypair().toSuiAddress() }),
		).toBe(false);
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
		const { signature } = await new Ed25519Keypair().signTransaction(transaction);
		const { client } = mockClient({ valid: false, reason: 'not an alias' });
		const options = { client, address: new Ed25519Keypair().toSuiAddress() };

		await expect(verifyTransactionSignature(transaction, signature, options)).rejects.toThrow(
			'Signature is not valid for the provided Transaction: not an alias',
		);
		expect(await isValidPersonalMessageSignature(message, signature, options)).toBe(false);
	});

	it('leaves decoding transaction bytes to the node', async () => {
		const bytes = new Uint8Array([...transaction, 0xff]);
		const { signature } = await new Ed25519Keypair().signTransaction(bytes);
		const { client, verifySignature: core } = mockClient({
			valid: false,
			reason: 'Failed to deserialize TransactionData from bytes',
		});

		expect(await isValidTransactionSignature(bytes, signature, { client })).toBe(false);
		await expect(verifyTransactionSignature(bytes, signature, { client })).rejects.toThrow(
			'Signature is not valid for the provided Transaction',
		);
		expect(core).toHaveBeenCalledWith(expect.objectContaining({ transaction: bytes }));
	});

	it('sends a transaction signature to the node as a transaction', async () => {
		const keypair = new Ed25519Keypair();
		const { signature } = await keypair.signTransaction(transaction);
		const { client, verifySignature: core } = mockClient();

		await verifyTransactionSignature(transaction, signature, { client });
		expect(core).toHaveBeenCalledWith({
			transaction,
			signature,
			address: keypair.toSuiAddress(),
			checkAddressAliases: false,
		});
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

	it('checks a signature without address against its own signer', async () => {
		const keypair = new Ed25519Keypair();
		const { signature } = await keypair.signPersonalMessage(message);
		const { client, verifySignature: core } = mockClient();

		await verifyPersonalMessageSignature(message, signature, { client });
		expect(core).toHaveBeenCalledWith({
			personalMessage: message,
			signature,
			address: keypair.toSuiAddress(),
			checkAddressAliases: false,
		});
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
		await expect(verifySignature(message, signature, { address: other })).rejects.toThrow(
			'Signature is not valid',
		);
	});

	it('throws for zkLogin offline, alone or in a multisig', async () => {
		const multisig = MultiSigPublicKey.fromPublicKeys({
			threshold: 1,
			publicKeys: [
				{
					publicKey: publicKeyFromRawBytes(
						'ZkLogin',
						parseSerializedZkLoginSignature(zkLoginSignature).publicKey,
					),
					weight: 1,
				},
			],
		}).combinePartialSignatures([zkLoginSignature]);
		for (const signature of [zkLoginSignature, multisig]) {
			await expect(
				isValidPersonalMessageSignature(message, signature, { offline: true }),
			).rejects.toThrow('zkLogin signatures cannot be verified offline');
		}
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
	const options = { personalMessage: 'hello', signature: 'AA==', address: '0x1' };

	it('checks aliases by default', async () => {
		const verifySignature = vi
			.fn()
			.mockResolvedValue({ response: { isValid: true, addressAliasesChecked: true } });
		const core = grpcCoreWith(verifySignature);
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
			await grpcCore({
				isValid: false,
				reason: 'bad',
				addressAliasesChecked: true,
			}).verifySignature(options),
		).toEqual({
			valid: false,
			reason: 'bad',
		});
	});

	it.each([
		['absent on a valid verdict', { isValid: true }],
		['absent on an invalid verdict', { isValid: false, reason: 'bad' }],
		['false', { isValid: true, addressAliasesChecked: false }],
	])('throws when the alias check marker is %s and aliases are checked', async (_, response) => {
		await expect(grpcCore(response).verifySignature(options)).rejects.toThrow(
			'The node does not support checking address aliases',
		);
	});

	it('accepts a server without the alias check marker when aliases are not checked', async () => {
		const exact = { ...options, checkAddressAliases: false };
		expect(await grpcCore({ isValid: true }).verifySignature(exact)).toEqual({ valid: true });
		expect(await grpcCore({ isValid: false, reason: 'bad' }).verifySignature(exact)).toEqual({
			valid: false,
			reason: 'bad',
		});
	});

	function rejecting(code: string) {
		return grpcCoreWith(vi.fn().mockRejectedValue(new RpcError('rejected', code)));
	}

	it('reports an unparseable signature as invalid', async () => {
		expect(await rejecting('INVALID_ARGUMENT').verifySignature(options)).toEqual({
			valid: false,
			reason: 'rejected',
		});
		expect(await grpcCore({}).verifySignature({ ...options, signature: 'not base64!' })).toEqual({
			valid: false,
			reason: 'Cannot parse signature',
		});
	});

	it('throws for other errors and an invalid address', async () => {
		await expect(rejecting('INTERNAL').verifySignature(options)).rejects.toThrow('rejected');
		await expect(
			grpcCore({}).verifySignature({ ...options, address: 'not an address' }),
		).rejects.toThrow('Invalid Sui address');
	});
});

describe('verifySignature without a verdict', () => {
	const options = { personalMessage: 'hello', signature: 'AA==', address: '0x1' };

	it('throws on gRPC when the response has no isValid', async () => {
		await expect(grpcCore({}).verifySignature(options)).rejects.toThrow('verdict');
	});

	it('throws on GraphQL when verifySignature is null', async () => {
		await expect(
			graphqlCore({ data: { verifySignature: null } }).verifySignature(options),
		).rejects.toThrow('verdict');
	});
});

describe('GraphQLCoreClient.verifySignature errors', () => {
	const options = { personalMessage: 'hello', signature: 'AA==', address: '0x1' };

	function rejecting(error: { message: string; path?: string[]; extensions?: object }) {
		return graphqlCore({
			data: { verifySignature: null },
			errors: [{ locations: [], ...error }],
		});
	}

	it('reports a bad user input error on the field as an invalid signature', async () => {
		const error = {
			message: 'Verification failed: signature from 0x2 is not an alias of 0x1',
			path: ['verifySignature'],
			extensions: { code: 'BAD_USER_INPUT' },
		};
		expect(await rejecting(error).verifySignature(options)).toEqual({
			valid: false,
			reason: error.message,
		});
	});

	it.each([
		['another code on the field', ['verifySignature'], 'INTERNAL_SERVER_ERROR'],
		['bad user input elsewhere', ['other'], 'BAD_USER_INPUT'],
	])('throws for %s', async (_, path, code) => {
		await expect(
			rejecting({ message: 'Verification failed: x', path, extensions: { code } }).verifySignature(
				options,
			),
		).rejects.toThrow('Verification failed: x');
	});
});

describe('verifySignature with transaction bytes the SDK cannot decode', () => {
	// The node decodes the bytes, so a new on-chain variant never fails locally.
	it.each([
		['an unknown TransactionData variant', new Uint8Array([1, ...transaction.slice(1)])],
		['trailing bytes', new Uint8Array([...transaction, 0xff])],
	])('sends %s to the node unchanged on both transports', async (_, bytes) => {
		const options = {
			transaction: bytes,
			signature: 'AA==',
			address: '0x1',
			checkAddressAliases: false,
		};
		const grpcVerify = vi.fn().mockResolvedValue({ response: { isValid: true } });
		const query = vi.fn().mockResolvedValue({ data: { verifySignature: { success: true } } });

		expect(await grpcCoreWith(grpcVerify).verifySignature(options)).toEqual({ valid: true });
		expect(await graphqlCoreWith(query).verifySignature(options)).toEqual({ valid: true });
		expect(grpcVerify.mock.calls[0][0].message.value).toEqual(bytes);
		expect(query.mock.calls[0][0].variables.message).toBe(toBase64(bytes));
	});

	it('reports GraphQL rejecting the bytes as an invalid signature', async () => {
		const error = 'Failed to deserialize TransactionData from bytes';
		const graphql = graphqlCore({
			data: { verifySignature: null },
			errors: [
				{
					message: error,
					locations: [],
					path: ['verifySignature'],
					extensions: { code: 'BAD_USER_INPUT' },
				},
			],
		});

		expect(
			await graphql.verifySignature({
				transaction: new Uint8Array([...transaction, 0xff]),
				signature: 'AA==',
				address: '0x1',
			}),
		).toEqual({ valid: false, reason: error });
	});
});

describe('offline verify helpers with trailing transaction bytes', () => {
	it('verify the signature over the bytes as given, as in 2.x', async () => {
		const keypair = new Ed25519Keypair();
		const bytes = new Uint8Array([...transaction, 0xff]);
		const { signature } = await keypair.signTransaction(bytes);
		const address = keypair.toSuiAddress();

		expect(await isValidTransactionSignature(bytes, signature, { offline: true, address })).toBe(
			true,
		);
	});
});

describe('verify helpers without a client or offline: true', () => {
	// The warning is logged once per module instance, so load a fresh one for each test.
	async function freshVerify() {
		vi.resetModules();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		return { ...(await import('../../../src/verify/index.js')), warn };
	}

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('verify offline with no options, as in 2.x', async () => {
		const { verifyPersonalMessageSignature, isValidTransactionSignature, warn } =
			await freshVerify();
		const keypair = new Ed25519Keypair();
		const { signature } = await keypair.signPersonalMessage(message);
		const { signature: txSignature } = await keypair.signTransaction(transaction);

		expect(
			// @ts-expect-error options are required
			(await verifyPersonalMessageSignature(message, signature)).toSuiAddress(),
		).toBe(keypair.toSuiAddress());
		// @ts-expect-error options are required
		expect(await isValidTransactionSignature(transaction, txSignature)).toBe(true);
		// @ts-expect-error options are required
		expect(await isValidTransactionSignature(message, txSignature)).toBe(false);
		expect(warn).toHaveBeenCalledOnce();
		expect(warn.mock.calls[0][0]).toContain('no client given, verifying offline');
	});

	it('check address offline when only address is given', async () => {
		const { isValidPersonalMessageSignature, verifyTransactionSignature, warn } =
			await freshVerify();
		const keypair = new Ed25519Keypair();
		const { signature } = await keypair.signPersonalMessage(message);
		const { signature: txSignature } = await keypair.signTransaction(transaction);
		const other = new Ed25519Keypair().toSuiAddress();

		// @ts-expect-error a client or offline: true is required
		const own: VerifyOptions = { address: keypair.toSuiAddress() };
		// @ts-expect-error a client or offline: true is required
		const notOwn: VerifyOptions = { address: other };
		expect(await isValidPersonalMessageSignature(message, signature, own)).toBe(true);
		expect(await isValidPersonalMessageSignature(message, signature, notOwn)).toBe(false);
		await expect(verifyTransactionSignature(transaction, txSignature, notOwn)).rejects.toThrow(
			'Signature is not valid for the provided address',
		);
		expect(warn).toHaveBeenCalledOnce();
	});

	it('still throw for zkLogin', async () => {
		const { isValidPersonalMessageSignature } = await freshVerify();
		// @ts-expect-error options are required
		await expect(isValidPersonalMessageSignature(message, zkLoginSignature)).rejects.toThrow(
			'zkLogin signatures cannot be verified offline',
		);
	});
});
