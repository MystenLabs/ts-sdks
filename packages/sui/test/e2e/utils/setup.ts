// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import type { ContainerRuntimeClient } from 'testcontainers';
import { getContainerRuntimeClient } from 'testcontainers';
import { retry } from 'ts-retry-promise';
import { expect, inject, it, test } from 'vitest';
import { WebSocket } from 'ws';

import type { SuiObjectChangePublished } from '../../../src/jsonRpc/index.js';
import {
	getJsonRpcFullnodeUrl,
	SuiJsonRpcClient,
	JsonRpcHTTPTransport,
} from '../../../src/jsonRpc/index.js';
import { SuiGrpcClient } from '../../../src/grpc/index.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import type { Keypair } from '../../../src/cryptography/index.js';
import {
	FaucetRateLimitError,
	getFaucetHost,
	requestSuiFromFaucetV2,
} from '../../../src/faucet/index.js';
import { Ed25519Keypair } from '../../../src/keypairs/ed25519/index.js';
import { Transaction, UpgradePolicy } from '../../../src/transactions/index.js';
import { SUI_TYPE_ARG, normalizeSuiAddress } from '../../../src/utils/index.js';
import type { ClientWithCoreApi } from '../../../src/client/core.js';
import type { PrePublishedPackage } from './prePublish.js';

const DEFAULT_FAUCET_URL = import.meta.env.FAUCET_URL ?? getFaucetHost('localnet');
const DEFAULT_FULLNODE_URL = import.meta.env.FULLNODE_URL ?? getJsonRpcFullnodeUrl('localnet');

const SUI_TOOLS_CONTAINER_ID = inject('suiToolsContainerId');

export const DEFAULT_RECIPIENT =
	'0x0c567ffdf8162cb6d51af74be0199443b92e823d4ba6ced24de5c6c463797d46';
export const DEFAULT_RECIPIENT_2 =
	'0xbb967ddbebfee8c40d8fdd2c24cb02452834cd3a7061d18564448f900eb9e66d';
export const DEFAULT_GAS_BUDGET = 10000000;
export const DEFAULT_SEND_AMOUNT = 1000;

const prePublishedPackages = inject('prePublishedPackages') as
	| Record<string, PrePublishedPackage>
	| undefined;

export class TestToolbox {
	keypair: Ed25519Keypair;
	jsonRpcClient: SuiJsonRpcClient;
	grpcClient: SuiGrpcClient;
	graphqlClient: SuiGraphQLClient;
	configPath: string;

	constructor(keypair: Ed25519Keypair, url: string = DEFAULT_FULLNODE_URL, configPath: string) {
		this.keypair = keypair;
		this.jsonRpcClient = new SuiJsonRpcClient({
			network: 'localnet',
			transport: new JsonRpcHTTPTransport({
				url,
				WebSocketConstructor: WebSocket as never,
			}),
		});
		this.grpcClient = new SuiGrpcClient({
			network: 'localnet',
			baseUrl: url,
		});
		// GraphQL port is injected by vitest setup
		const graphqlPort = inject('graphqlPort');
		this.graphqlClient = new SuiGraphQLClient({
			network: 'localnet',
			url: `http://127.0.0.1:${graphqlPort}/graphql`,
		});
		this.configPath = configPath;
	}

	address() {
		return this.keypair.getPublicKey().toSuiAddress();
	}

	async getGasObjectsOwnedByAddress() {
		return await this.jsonRpcClient.getCoins({
			owner: this.address(),
			coinType: SUI_TYPE_ARG,
		});
	}

	public async getActiveValidators() {
		return (await this.jsonRpcClient.getLatestSuiSystemState()).activeValidators;
	}

	public getPackage(name: string, options?: { normalized?: boolean }): string {
		const { normalized = true } = options ?? {};

		const info = prePublishedPackages?.[name];
		if (!info) {
			throw new Error(
				`Package "${name}" not found. Add it to PACKAGES_TO_PREPUBLISH in prePublish.ts`,
			);
		}

		if (normalized) {
			return info.packageId;
		}
		// Strip leading zeros for JSON RPC compatibility
		return info.packageId.replace(/^(0x)(0+)/, '0x');
	}

	/**
	 * Get a shared object ID from a pre-published package.
	 * Returns undefined if the package wasn't pre-published or doesn't have the specified shared object.
	 */
	public getSharedObject(packageName: string, typeName: string): string | undefined {
		return prePublishedPackages?.[packageName]?.sharedObjects?.[typeName];
	}

	mintNft(name: string = 'Test NFT') {
		const packageId = this.getPackage('test_data');
		return (tx: Transaction) => {
			return tx.moveCall({
				target: `${packageId}::demo_bear::new`,
				arguments: [tx.pure.string(name)],
			});
		};
	}

	/**
	 * Test that all three client implementations (JSON RPC, gRPC, GraphQL) return the same data
	 * for a given query. This ensures consistency across the different transport layers.
	 *
	 * @param queryFn - Function that takes a client and returns a promise with the query result
	 * @param normalize - Optional function to normalize results before comparison (e.g., to ignore cursor differences)
	 * @param options - Options to skip the test entirely
	 */
	async expectAllClientsReturnSameData<T>(
		queryFn: (client: ClientWithCoreApi, kind: 'jsonrpc' | 'grpc' | 'graphql') => Promise<T>,
		normalize?: (result: T) => T,
		options?: { skip?: boolean },
	) {
		if (options?.skip) {
			test.skip('all clients return same data', () => {});
			return;
		}

		const [jsonRpcResult, grpcResult, graphqlResult] = await Promise.all([
			queryFn(this.jsonRpcClient, 'jsonrpc'),
			queryFn(this.grpcClient, 'grpc'),
			queryFn(this.graphqlClient, 'graphql'),
		]);

		const normalizedJson = normalize ? normalize(jsonRpcResult) : jsonRpcResult;
		const normalizedGrpc = normalize ? normalize(grpcResult) : grpcResult;
		const normalizedGraphql = normalize ? normalize(graphqlResult) : graphqlResult;

		expect(normalizedJson).toEqual(normalizedGrpc);
		expect(normalizedJson).toEqual(normalizedGraphql);
	}
}

/**
 * Creates a test helper function that runs tests against all three client implementations.
 * This should be called at module level with a getter function that will return the toolbox or clients.
 *
 * @param getClients - A function that returns clients. Can be either:
 *   - () => TestToolbox (for localnet tests using the standard test setup)
 *   - () => { jsonRpc: Client, grpc: Client, graphql: Client } (for custom client configurations like testnet)
 * @returns A function that creates test cases for all clients
 */
export function createTestWithAllClients(
	getClients:
		| (() => TestToolbox)
		| (() => {
				jsonRpc: ClientWithCoreApi;
				grpc: ClientWithCoreApi;
				graphql: ClientWithCoreApi;
		  }),
) {
	return function testWithAllClients(
		testName: string,
		testFn: (client: ClientWithCoreApi, kind: 'jsonrpc' | 'grpc' | 'graphql') => Promise<void>,
		options?: { skip?: Array<'jsonrpc' | 'grpc' | 'graphql'> | boolean },
	) {
		// If skip is true, skip all tests
		if (options?.skip === true) {
			test.skip(`[JSON RPC] ${testName}`, () => {});
			test.skip(`[gRPC] ${testName}`, () => {});
			test.skip(`[GraphQL] ${testName}`, () => {});
			return;
		}

		const skipArray = Array.isArray(options?.skip) ? options.skip : [];

		// Helper to get the clients from either format
		const clients = () => {
			const result = getClients();
			if ('jsonRpcClient' in result) {
				// It's a TestToolbox
				return {
					jsonRpc: result.jsonRpcClient,
					grpc: result.grpcClient,
					graphql: result.graphqlClient,
				};
			}
			// It's already in the correct format
			return result;
		};

		if (!skipArray.includes('jsonrpc')) {
			it(`[JSON RPC] ${testName}`, async () => {
				await testFn(clients().jsonRpc, 'jsonrpc');
			});
		} else {
			test.skip(`[JSON RPC] ${testName}`, () => {});
		}

		if (!skipArray.includes('grpc')) {
			it(`[gRPC] ${testName}`, async () => {
				await testFn(clients().grpc, 'grpc');
			});
		} else {
			test.skip(`[gRPC] ${testName}`, () => {});
		}

		if (!skipArray.includes('graphql')) {
			it(`[GraphQL] ${testName}`, async () => {
				await testFn(clients().graphql, 'graphql');
			});
		} else {
			test.skip(`[GraphQL] ${testName}`, () => {});
		}
	};
}

export function getClient(url = DEFAULT_FULLNODE_URL): SuiJsonRpcClient {
	return new SuiJsonRpcClient({
		network: 'localnet',
		transport: new JsonRpcHTTPTransport({
			url,
			WebSocketConstructor: WebSocket as never,
		}),
	});
}

export async function setup(options: { graphQLURL?: string; rpcURL?: string } = {}) {
	const keypair = Ed25519Keypair.generate();
	const address = keypair.getPublicKey().toSuiAddress();

	const configDir = path.join('/test-data', `${Math.random().toString(36).substring(2, 15)}`);
	await execSuiTools(['mkdir', '-p', configDir]);
	const configPath = path.join(configDir, 'client.yaml');
	return setupWithFundedAddress(keypair, address, configPath, options);
}

export async function setupWithFundedAddress(
	keypair: Ed25519Keypair,
	address: string,
	configPath: string,
	{ rpcURL }: { graphQLURL?: string; rpcURL?: string } = {},
) {
	const faucetResponse = await retry(
		async () => await requestSuiFromFaucetV2({ host: DEFAULT_FAUCET_URL, recipient: address }),
		{
			backoff: 'EXPONENTIAL',
			// overall timeout in 60 seconds
			timeout: 1000 * 60,
			// skip retry if we hit the rate-limit error
			retryIf: (error: any) => !(error instanceof FaucetRateLimitError),
			logger: (msg) => console.warn('Retrying requesting from faucet: ' + msg),
		},
	);

	// Create toolbox early so we can wait on all clients
	await execSuiTools(['sui', 'client', '--yes', '--client.config', configPath]);
	const toolbox = new TestToolbox(keypair, rpcURL, configPath);

	// Wait for the faucet transaction on all clients to ensure indexers have caught up
	const digest = faucetResponse.coins_sent?.[0]?.transferTxDigest;
	if (digest) {
		await Promise.all([
			toolbox.jsonRpcClient.core.waitForTransaction({ digest }),
			toolbox.grpcClient.core.waitForTransaction({ digest }),
			toolbox.graphqlClient.core.waitForTransaction({ digest }),
		]);
	}

	return toolbox;
}

export async function publishPackage(packageName: string, toolbox?: TestToolbox) {
	// TODO: We create a unique publish address per publish, but we really could share one for all publishes.
	if (!toolbox) {
		toolbox = await setup();
	}

	return await retry(
		async () => {
			const result = await execSuiTools([
				'sui',
				'move',
				'--client.config',
				toolbox.configPath,
				'build',
				'--dump-bytecode-as-base64',
				'--path',
				`/test-data/${packageName}`,
			]);

			if (!result.stdout.includes('{')) {
				console.error(result.stdout);
				throw new Error('Failed to publish package');
			}

			let resultJson;
			try {
				resultJson = JSON.parse(
					result.stdout.slice(result.stdout.indexOf('{'), result.stdout.lastIndexOf('}') + 1),
				);
			} catch (error) {
				console.error(error);
				throw new Error('Failed to publish package');
			}

			const { modules, dependencies } = resultJson;

			const tx = new Transaction();
			const cap = tx.publish({
				modules,
				dependencies,
			});

			// Transfer the upgrade capability to the sender so they can upgrade the package later if they want.
			tx.transferObjects([cap], tx.pure.address(toolbox.address()));

			const { digest } = await toolbox.jsonRpcClient.signAndExecuteTransaction({
				transaction: tx,
				signer: toolbox.keypair,
			});

			const publishTxn = await toolbox.jsonRpcClient.waitForTransaction({
				digest: digest,
				options: { showObjectChanges: true, showEffects: true },
			});

			expect(publishTxn.effects?.status.status).toEqual('success');

			const packageId = normalizeSuiAddress(
				((publishTxn.objectChanges?.filter(
					(a) => a.type === 'published',
				) as SuiObjectChangePublished[]) ?? [])[0]?.packageId,
			);

			expect(packageId).toBeTypeOf('string');

			return { packageId, publishTxn };
		},
		{
			backoff: 'EXPONENTIAL',
			timeout: 1000 * 60 * 3,
			retries: 3,
			logger: (msg) => console.warn('Retrying package publish: ' + msg),
		},
	);
}

export async function upgradePackage(
	packageId: string,
	capId: string,
	packageName: string,
	toolbox?: TestToolbox,
) {
	// TODO: We create a unique publish address per publish, but we really could share one for all publishes.
	if (!toolbox) {
		toolbox = await setup();
	}
	const { stdout } = await execSuiTools([
		'sui',
		'move',
		'--client.config',
		toolbox.configPath,
		'build',
		'--dump-bytecode-as-base64',
		'--path',
		`/test-data/${packageName}`,
	]);

	if (!stdout.includes('{')) {
		console.log(stdout);

		throw new Error('Failed to upgrade package');
	}

	const { modules, dependencies, digest } = JSON.parse(stdout.slice(stdout.indexOf('{')));

	const tx = new Transaction();

	const cap = tx.object(capId);
	const ticket = tx.moveCall({
		target: '0x2::package::authorize_upgrade',
		arguments: [cap, tx.pure.u8(UpgradePolicy.COMPATIBLE), tx.pure.vector('u8', digest)],
	});

	const receipt = tx.upgrade({
		modules,
		dependencies,
		package: packageId,
		ticket,
	});

	tx.moveCall({
		target: '0x2::package::commit_upgrade',
		arguments: [cap, receipt],
	});

	const result = await toolbox.jsonRpcClient.signAndExecuteTransaction({
		transaction: tx,
		signer: toolbox.keypair,
		options: {
			showEffects: true,
			showObjectChanges: true,
		},
	});

	expect(result.effects?.status.status).toEqual('success');
}

export function getRandomAddresses(n: number): string[] {
	return Array(n)
		.fill(null)
		.map(() => {
			const keypair = Ed25519Keypair.generate();
			return keypair.getPublicKey().toSuiAddress();
		});
}

export async function paySui(
	client: SuiJsonRpcClient,
	signer: Keypair,
	numRecipients: number = 1,
	recipients?: string[],
	amounts?: number[],
	coinId?: string,
) {
	const tx = new Transaction();

	recipients = recipients ?? getRandomAddresses(numRecipients);
	amounts = amounts ?? Array(numRecipients).fill(DEFAULT_SEND_AMOUNT);

	expect(recipients.length === amounts.length, 'recipients and amounts must be the same length');

	coinId =
		coinId ??
		(
			await client.getCoins({
				owner: signer.getPublicKey().toSuiAddress(),
				coinType: '0x2::sui::SUI',
			})
		).data[0].coinObjectId;

	recipients.forEach((recipient, i) => {
		const coin = tx.splitCoins(coinId!, [amounts![i]]);
		tx.transferObjects([coin], tx.pure.address(recipient));
	});

	const txn = await client.signAndExecuteTransaction({
		transaction: tx,
		signer,
		options: {
			showEffects: true,
			showObjectChanges: true,
		},
	});

	await client.waitForTransaction({
		digest: txn.digest,
	});
	expect(txn.effects?.status.status).toEqual('success');
	return txn;
}

export async function executePaySuiNTimes(
	client: SuiJsonRpcClient,
	signer: Keypair,
	nTimes: number,
	numRecipientsPerTxn: number = 1,
	recipients?: string[],
	amounts?: number[],
) {
	const txns = [];
	for (let i = 0; i < nTimes; i++) {
		// must await here to make sure the txns are executed in order
		txns.push(await paySui(client, signer, numRecipientsPerTxn, recipients, amounts));
	}
	return txns;
}

const client = await getContainerRuntimeClient();

export async function execSuiTools(
	command: string[],
	options?: Parameters<ContainerRuntimeClient['container']['exec']>[2],
) {
	const container = client.container.getById(SUI_TOOLS_CONTAINER_ID);

	const result = await client.container.exec(container, command, options);

	if (result.stderr) {
		console.log(result.stderr);
	}

	return result;
}
