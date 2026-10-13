// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import type { SuiClientTypes } from '@mysten/sui/client';
import { FaucetRateLimitError, getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import type { ContainerRuntimeClient } from 'testcontainers';
import { getContainerRuntimeClient } from 'testcontainers';
import { retry } from 'ts-retry-promise';
import { expect, inject } from 'vitest';

import type { KioskClient } from '../../src/index.js';
import { KioskTransaction } from '../../src/index.js';

const DEFAULT_FAUCET_URL = process.env.FAUCET_URL ?? getFaucetHost('localnet');
const DEFAULT_FULLNODE_URL = process.env.FULLNODE_URL ?? 'http://127.0.0.1:9000';
const DEFAULT_GRAPHQL_URL = process.env.GRAPHQL_URL ?? 'http://127.0.0.1:9125/graphql';

export class TestToolbox {
	keypair: Ed25519Keypair;
	client: SuiGrpcClient;
	configPath: string;

	constructor(keypair: Ed25519Keypair, client: SuiGrpcClient, configPath: string) {
		this.keypair = keypair;
		this.client = client;
		this.configPath = configPath;
	}

	address() {
		return this.keypair.getPublicKey().toSuiAddress();
	}
}

const graphqlClient = new SuiGraphQLClient({
	network: 'localnet',
	url: DEFAULT_GRAPHQL_URL,
});

export function getClient(): SuiGrpcClient {
	const client = new SuiGrpcClient({
		network: 'localnet',
		baseUrl: DEFAULT_FULLNODE_URL,
	});
	// Kiosk finds transfer policies through `listEvents`, which the pinned localnet image's gRPC
	// server does not implement yet. Serve it from the localnet GraphQL endpoint until it does.
	client.core.listEvents = (options) => graphqlClient.core.listEvents(options);
	return client;
}

// TODO: expose these testing utils from @mysten/sui
export async function setupSuiClient() {
	const keypair = Ed25519Keypair.generate();
	const address = keypair.getPublicKey().toSuiAddress();
	const client = getClient();
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
	return new TestToolbox(keypair, client, configPath);
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

	const publishTxn = await executeTransaction(toolbox, tx);

	const packageId = publishTxn.effects.changedObjects
		.find((change) => change.outputState === 'PackageWrite')
		?.objectId.replace(/^(0x)(0+)/, '0x') as string;

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

type ExecutedTransaction = SuiClientTypes.Transaction<{
	effects: true;
	events: true;
	objectTypes: true;
}>;

function getCreatedObjectIdByType(res: ExecutedTransaction, type: string): string {
	const created = res.effects.changedObjects.find(
		(change) =>
			change.idOperation === 'Created' && res.objectTypes[change.objectId]?.endsWith(type),
	);
	expect(created).toBeDefined();
	return created!.objectId;
}

export async function getPublisherObject(toolbox: TestToolbox): Promise<string> {
	const res = await toolbox.client.core.listOwnedObjects({
		type: '0x2::package::Publisher',
		owner: toolbox.address(),
	});

	const publisherObj = res.objects[0]?.objectId;
	expect(publisherObj).not.toBeUndefined();

	return publisherObj ?? '';
}

export async function executeTransaction(
	toolbox: TestToolbox,
	tx: Transaction,
): Promise<ExecutedTransaction> {
	const result = await toolbox.client.core.signAndExecuteTransaction({
		signer: toolbox.keypair,
		transaction: tx,
		include: { effects: true, events: true, objectTypes: true },
	});
	if (result.$kind !== 'Transaction') {
		throw new Error(
			`Transaction failed: ${result.FailedTransaction.status.error?.message ?? 'unknown error'}`,
		);
	}
	await Promise.all([
		toolbox.client.core.waitForTransaction({ result }),
		graphqlClient.core.waitForTransaction({ result }),
	]);
	return result.Transaction;
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
