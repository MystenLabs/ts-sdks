// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import { FaucetRateLimitError, getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import type { ContainerRuntimeClient } from 'testcontainers';
import { getContainerRuntimeClient } from 'testcontainers';
import { retry } from 'ts-retry-promise';
import { expect, inject } from 'vitest';

import type { KioskClient } from '../../src/index.js';
import { KioskTransaction } from '../../src/index.js';

const DEFAULT_FAUCET_URL = process.env.FAUCET_URL ?? getFaucetHost('localnet');
const DEFAULT_FULLNODE_URL = process.env.FULLNODE_URL ?? getJsonRpcFullnodeUrl('localnet');
const DEFAULT_GRAPHQL_URL = process.env.GRAPHQL_URL ?? 'http://127.0.0.1:9125/graphql';
const DEFAULT_GRPC_URL = process.env.GRPC_URL ?? 'http://127.0.0.1:12347';

export type ClientType = 'jsonrpc' | 'graphql' | 'grpc';

export class TestToolbox {
	keypair: Ed25519Keypair;
	client: ClientWithCoreApi;
	clientType: ClientType;
	configPath: string;

	constructor(
		keypair: Ed25519Keypair,
		client: ClientWithCoreApi,
		clientType: ClientType,
		configPath: string,
	) {
		this.keypair = keypair;
		this.client = client;
		this.clientType = clientType;
		this.configPath = configPath;
	}

	address() {
		return this.keypair.getPublicKey().toSuiAddress();
	}

	public async getActiveValidators() {
		// Use JSON-RPC client for system state as it's the most reliable
		if ('getLatestSuiSystemState' in this.client) {
			return (await (this.client as SuiJsonRpcClient).getLatestSuiSystemState()).activeValidators;
		}
		// For other client types, we would need to implement GraphQL/gRPC queries
		throw new Error(`getActiveValidators not supported for ${this.clientType} client`);
	}
}

export function getClient(type: ClientType = 'jsonrpc'): ClientWithCoreApi {
	switch (type) {
		case 'jsonrpc':
			return new SuiJsonRpcClient({
				network: 'localnet',
				url: DEFAULT_FULLNODE_URL,
			});
		case 'graphql':
			return new SuiGraphQLClient({
				network: 'localnet',
				url: DEFAULT_GRAPHQL_URL,
			});
		case 'grpc':
			return new SuiGrpcClient({
				network: 'localnet',
				baseUrl: DEFAULT_GRPC_URL,
			});
		default:
			throw new Error(`Unknown client type: ${type}`);
	}
}

// TODO: expose these testing utils from @mysten/sui
export async function setupSuiClient(clientType: ClientType = 'jsonrpc') {
	const keypair = Ed25519Keypair.generate();
	const address = keypair.getPublicKey().toSuiAddress();
	const client = getClient(clientType);
	await retry(() => requestSuiFromFaucetV2({ host: DEFAULT_FAUCET_URL, recipient: address }), {
		backoff: 'EXPONENTIAL',
		// overall timeout in 60 seconds
		timeout: 1000 * 60,
		// skip retry if we hit the rate-limit error
		retryIf: (error: any) => !(error instanceof FaucetRateLimitError),
		logger: (msg) => console.warn('Retrying requesting from faucet: ' + msg),
	});

	const configDir = path.join('/test-data', `${Math.random().toString(36).substring(2, 15)}`);
	await execSuiTools(['mkdir', '-p', configDir]);
	const configPath = path.join(configDir, 'client.yaml');
	await execSuiTools(['sui', 'client', '--yes', '--client.config', configPath]);
	return new TestToolbox(keypair, client, clientType, configPath);
}

export async function publishPackage(packageName: string, toolbox?: TestToolbox) {
	// TODO: We create a unique publish address per publish, but we really could share one for all publishes.
	if (!toolbox) {
		toolbox = await setupSuiClient();
	}

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

	const { modules, dependencies } = JSON.parse(
		result.stdout.slice(result.stdout.indexOf('{'), result.stdout.lastIndexOf('}') + 1),
	);

	const tx = new Transaction();
	const cap = tx.publish({
		modules,
		dependencies,
	});

	// Transfer the upgrade capability to the sender so they can upgrade the package later if they want.
	tx.transferObjects([cap], tx.pure.address(toolbox.address()));

	const publishTxn = await toolbox.keypair.signAndExecuteTransaction({
		transaction: tx,
		client: toolbox.client,
	});

	// Wait for the transaction to be indexed
	const txn = publishTxn.Transaction ?? publishTxn.FailedTransaction;
	await toolbox.client.core.waitForTransaction({ digest: txn!.digest });
	expect(txn?.status.success).toEqual(true);

	// Find the published package from changedObjects
	const publishedPackage = txn?.effects?.changedObjects.find(
		(obj) => obj.outputState === 'PackageWrite',
	);
	const packageId = publishedPackage?.objectId.replace(/^(0x)(0+)/, '0x') as string;

	expect(packageId).toBeTypeOf('string');

	return { packageId, publishTxn };
}

export async function publishExtensionsPackage(toolbox: TestToolbox): Promise<string> {
	const { packageId } = await publishPackage('kiosk', toolbox);

	return packageId;
}

export async function publishHeroPackage(toolbox: TestToolbox): Promise<string> {
	const { packageId } = await publishPackage('hero', toolbox);

	return packageId;
}

export function print(item: any) {
	console.dir(item, { depth: null });
}

export async function mintHero(toolbox: TestToolbox, packageId: string): Promise<string> {
	const tx = new Transaction();
	const hero = tx.moveCall({
		target: `${packageId}::hero::mint_hero`,
	});
	tx.transferObjects([hero], toolbox.address());

	const res = await executeTransaction(toolbox, tx);

	return getCreatedObjectIdByType(res, 'hero::Hero');
}

export async function mintVillain(toolbox: TestToolbox, packageId: string): Promise<string> {
	const tx = new Transaction();
	const hero = tx.moveCall({
		target: `${packageId}::hero::mint_villain`,
	});
	tx.transferObjects([hero], toolbox.address());

	const res = await executeTransaction(toolbox, tx);

	return getCreatedObjectIdByType(res, 'hero::Villain');
}

// create a non-personal kiosk.
export async function createKiosk(toolbox: TestToolbox, kioskClient: KioskClient) {
	const tx = new Transaction();

	new KioskTransaction({ transaction: tx, kioskClient }).createAndShare(toolbox.address());

	await executeTransaction(toolbox, tx);
}

// Create a personal Kiosk.
export async function createPersonalKiosk(toolbox: TestToolbox, kioskClient: KioskClient) {
	const tx = new Transaction();
	new KioskTransaction({ transaction: tx, kioskClient }).createPersonal().finalize();

	await executeTransaction(toolbox, tx);
}

type TransactionResultWithEffectsAndTypes = SuiClientTypes.TransactionResult<{
	effects: true;
	objectTypes: true;
}>;

function getCreatedObjectIdByType(res: TransactionResultWithEffectsAndTypes, type: string): string {
	const txn = res.Transaction ?? res.FailedTransaction;
	const createdObject = txn?.effects?.changedObjects.find(
		(obj) =>
			obj.idOperation === 'Created' &&
			obj.outputState === 'ObjectWrite' &&
			txn.objectTypes?.[obj.objectId]?.endsWith(type),
	);
	if (!createdObject) {
		throw new Error(`No created object found with type ending in ${type}`);
	}
	return createdObject.objectId;
}

export async function getPublisherObject(toolbox: TestToolbox): Promise<string> {
	const res = await toolbox.client.core.listOwnedObjects({
		owner: toolbox.address(),
		type: '0x2::package::Publisher',
	});

	const publisherObj = res.objects[0]?.objectId;
	expect(publisherObj).not.toBeUndefined();

	return publisherObj ?? '';
}

export async function executeTransaction(
	toolbox: TestToolbox,
	tx: Transaction,
): Promise<TransactionResultWithEffectsAndTypes> {
	tx.setSenderIfNotSet(toolbox.keypair.toSuiAddress());
	const bytes = await tx.build({ client: toolbox.client });
	const { signature } = await toolbox.keypair.signTransaction(bytes);

	const resp = await toolbox.client.core.executeTransaction({
		transaction: bytes,
		signatures: [signature],
		include: {
			effects: true,
			objectTypes: true,
		},
	});

	const txn = resp.Transaction ?? resp.FailedTransaction;
	// Wait for the transaction to be indexed
	await toolbox.client.core.waitForTransaction({ digest: txn!.digest });
	expect(txn?.status.success).toEqual(true);
	return resp;
}

export async function simulateTransaction(
	toolbox: TestToolbox,
	tx: Transaction,
): Promise<SuiClientTypes.SimulateTransactionResult<{ commandResults: true }>> {
	return await toolbox.client.core.simulateTransaction({
		transaction: tx,
		include: { commandResults: true },
	});
}

const SUI_TOOLS_CONTAINER_ID = inject('suiToolsContainerId');
export async function execSuiTools(
	command: string[],
	options?: Parameters<ContainerRuntimeClient['container']['exec']>[2],
) {
	const client = await getContainerRuntimeClient();
	const container = client.container.getById(SUI_TOOLS_CONTAINER_ID);

	const result = await client.container.exec(container, command, options);

	if (result.stderr) {
		console.log(result.stderr);
	}

	return result;
}
