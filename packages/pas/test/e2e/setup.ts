// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import type { ClientWithExtensions } from '@mysten/sui/client';
import { FaucetRateLimitError, getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { ContainerRuntimeClient } from 'testcontainers';
import { getContainerRuntimeClient } from 'testcontainers';
import { retry } from 'ts-retry-promise';
import { expect, inject } from 'vitest';

import { pas, type PASClient } from '../../src/index.js';

const DEFAULT_FAUCET_URL = process.env.FAUCET_URL ?? getFaucetHost('localnet');
const DEFAULT_FULLNODE_URL = process.env.FULLNODE_URL ?? 'http://127.0.0.1:9000';
const DEFAULT_GRAPHQL_URL = process.env.GRAPHQL_URL ?? 'http://127.0.0.1:9125/graphql';

export type PASClientType = ClientWithExtensions<{ pas: PASClient }, SuiGrpcClient>;

export type PublishedPackage = {
	digest: string;
	createdObjects: {
		id: string;
		type: string;
	}[];
	originalId: string;
	publishedAt: string;
};
export class TestToolbox {
	keypair: Ed25519Keypair;
	client: PASClientType;
	configPath: string;
	pubFilePath: string;
	publishedPackages: Record<string, PublishedPackage>;
	private publishLock: Promise<void> = Promise.resolve();

	constructor(
		keypair: Ed25519Keypair,
		client: PASClientType,
		configPath: string,
		pubFilePath: string,
		publishedPackages: Record<string, PublishedPackage>,
	) {
		this.keypair = keypair;
		this.client = client;
		this.configPath = configPath;
		this.pubFilePath = pubFilePath;
		this.publishedPackages = publishedPackages;
	}

	address() {
		return this.keypair.getPublicKey().toSuiAddress();
	}

	/// Publishes a package at a given path.
	/// IF the package is already published under the same key, we return its data.
	/// It only does sequential writes to avoid equivocation (we use a mutex).
	/// An optional `cacheKey` allows publishing the same package path multiple
	/// times under different keys (e.g. two independent demo_usd instances).
	async publishPackage(packagePath: string, cacheKey?: string) {
		const key = cacheKey ?? packagePath;

		// Ensure only one publish happens at a time using the mutex
		const currentLock = this.publishLock;
		let releaseLock: () => void;
		this.publishLock = new Promise<void>((resolve) => {
			releaseLock = resolve;
		});

		await currentLock;

		// If the package has already been published, return the published data.
		if (this.publishedPackages[key]) {
			releaseLock!();
			return this.publishedPackages[key];
		}

		try {
			const publicationData = await publishPackage(packagePath, {
				configPath: this.configPath,
				pubFilePath: this.pubFilePath,
				baseClient: this.client,
			});

			this.publishedPackages[key] = {
				digest: publicationData.digest,
				createdObjects: publicationData.createdObjects,
				originalId: publicationData.packageId,
				publishedAt: publicationData.packageId,
			};

			return this.publishedPackages[key];
		} finally {
			// Release the lock so the next publish can proceed
			releaseLock!();
		}
	}

	async simulateTransaction(tx: Transaction) {
		return simulateTransaction(this, tx);
	}

	async executeTransaction(tx: Transaction) {
		return executeTransaction(this, tx);
	}

	// Creates a account for a given address.
	async createAccountForAddress(address: string) {
		const tx = new Transaction();
		tx.add(this.client.pas.call.accountForAddress(address));
		return this.executeTransaction(tx);
	}

	async getBalance(address: string, assetType: string) {
		return this.client.core.getBalance({
			owner: normalizeSuiAddress(address),
			coinType: assetType,
		});
	}
}

export function getClient(): SuiGrpcClient {
	return new SuiGrpcClient({
		network: 'localnet',
		baseUrl: DEFAULT_FULLNODE_URL,
	});
}

export async function setupToolbox() {
	const keypair = Ed25519Keypair.generate();
	const address = keypair.getPublicKey().toSuiAddress();
	const baseClient = getClient();

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

	const pubFilePath = path.join(configDir, 'publications.toml');

	await execSuiTools(['sui', 'client', '--client.config', configPath, 'switch', '--env', 'local']);
	await execSuiTools(['sui', 'client', '--client.config', configPath, 'faucet']);

	const publishedPackages: Record<string, PublishedPackage> = {};

	// Publish demo_usd with --publish-unpublished-deps so that pas and ptb
	// are transitively published without needing local copies of those packages.
	const demoUsdData = await publishPackage('demo_usd', {
		configPath,
		pubFilePath,
		baseClient,
	});

	publishedPackages.demo_usd = {
		digest: demoUsdData.digest,
		createdObjects: demoUsdData.createdObjects,
		originalId: demoUsdData.packageId,
		publishedAt: demoUsdData.packageId,
	};

	// Discover the transitively-published pas package by querying the CLI
	// sender's recent transactions via GraphQL.
	const cliAddress = await getCliAddress(configPath);
	const pasPublish = await discoverPasPackage(cliAddress, demoUsdData.digest);

	publishedPackages.pas = {
		digest: pasPublish.digest,
		createdObjects: pasPublish.createdObjects,
		originalId: pasPublish.packageId,
		publishedAt: pasPublish.packageId,
	};

	const pasPackageId = pasPublish.packageId;
	const namespaceId = pasPublish.createdObjects.find((obj) =>
		obj.type.endsWith('namespace::Namespace'),
	)?.id!;
	const upgradeCapId = pasPublish.createdObjects.find((obj) =>
		obj.type.endsWith('UpgradeCap'),
	)?.id!;

	const client = baseClient.$extend(
		pas({
			packageConfig: {
				packageId: pasPackageId,
				namespaceId,
			},
		}),
	);

	// Link the UpgradeCap to the Namespace (required before any derived object operations).
	// This must be done via CLI since the UpgradeCap is owned by the CLI address, not the test keypair.
	await execSuiTools([
		'sui',
		'client',
		'--client.config',
		configPath,
		'ptb',
		'--move-call',
		`${pasPackageId}::namespace::setup`,
		`@${namespaceId} @${upgradeCapId}`,
		'--move-call',
		`${pasPackageId}::templates::setup`,
		`@${namespaceId}`,
		'--json',
	]);

	return new TestToolbox(keypair, client, configPath, pubFilePath, publishedPackages);
}

async function getCliAddress(configPath: string): Promise<string> {
	const result = await execSuiTools([
		'sui',
		'client',
		'--client.config',
		configPath,
		'active-address',
	]);
	return normalizeSuiAddress(result.stdout.trim());
}

const DISCOVER_PAS_QUERY = `
query ($sender: String!) {
  address(address: $sender) {
    transactions(relation: SENT, last: 10) {
      nodes {
        digest
        effects {
          objectChanges(first: 50) {
            nodes {
              address
              idCreated
              outputState {
                asMovePackage {
                  address
                }
                asMoveObject {
                  contents {
                    type { repr }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
` as const;

type GqlObjectChangeNode = {
	address: string;
	idCreated: boolean | null;
	outputState: {
		asMovePackage: { address: string } | null;
		asMoveObject: { contents: { type: { repr: string } } | null } | null;
	} | null;
};

type GqlTransactionNode = {
	digest: string;
	effects: {
		objectChanges: {
			nodes: GqlObjectChangeNode[];
		};
	};
};

/** Response shape for DISCOVER_PAS_QUERY — use for type-safe query result. */
type DiscoverPasQueryData = {
	address?: {
		transactions: {
			nodes: GqlTransactionNode[];
		};
	} | null;
};

/**
 * After publishing demo_usd with --publish-unpublished-deps, the CLI sender
 * will have executed separate transactions for each transitive dependency.
 * This function queries those transactions via GraphQL and identifies the one
 * that published the `pas` package (by looking for a created Namespace object).
 */
async function discoverPasPackage(
	senderAddress: string,
	excludeDigest: string,
): Promise<{ digest: string; packageId: string; createdObjects: { id: string; type: string }[] }> {
	const graphqlClient = new SuiGraphQLClient({
		url: DEFAULT_GRAPHQL_URL,
		network: 'localnet',
	});

	// The indexer may lag behind the fullnode, so retry until the transactions appear.
	const result = await retry(
		async () => {
			const { data, errors } = await graphqlClient.query<DiscoverPasQueryData>({
				query: DISCOVER_PAS_QUERY,
				variables: { sender: senderAddress },
			});

			if (errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
			const txNodes = data?.address?.transactions?.nodes;
			if (!txNodes?.length) throw new Error('No transactions found for CLI sender');

			// Find the transaction that created a Namespace object (that's the pas publish).
			for (const tx of txNodes) {
				if (tx.digest === excludeDigest) continue;

				const changes = tx.effects.objectChanges.nodes;
				const hasNamespace = changes.some(
					(c) =>
						c.idCreated &&
						c.outputState?.asMoveObject?.contents?.type?.repr?.includes('namespace::Namespace'),
				);
				if (!hasNamespace) continue;

				const packageId = changes.find((c) => c.idCreated && c.outputState?.asMovePackage)
					?.outputState?.asMovePackage?.address;
				if (!packageId) continue;

				const createdObjects = changes
					.filter((c) => c.idCreated && c.outputState?.asMoveObject)
					.map((c) => ({
						id: c.address,
						type: c.outputState!.asMoveObject!.contents!.type.repr,
					}));

				return { digest: tx.digest, packageId, createdObjects };
			}

			throw new Error('Could not find pas publish transaction among sender transactions');
		},
		{
			backoff: 'EXPONENTIAL',
			timeout: 1000 * 60,
			logger: (msg) => console.warn('Retrying pas package discovery: ' + msg),
		},
	);

	return result;
}

async function publishPackage(
	packageName: string,
	{
		configPath,
		pubFilePath,
		baseClient,
	}: {
		configPath: string;
		pubFilePath: string;
		baseClient: SuiGrpcClient;
	},
) {
	const result = await execSuiTools([
		'sui',
		'client',
		'--client.config',
		configPath,
		'test-publish',
		'--build-env',
		'testnet',
		'--publish-unpublished-deps',
		'--pubfile-path',
		pubFilePath,
		`/test-data/${packageName}`,
		'--json',
	]);

	// trim everything before `{`
	const resultJson = result.stdout.substring(result.stdout.indexOf('{'));
	const publicationDigest = JSON.parse(resultJson).digest;

	// Get the TX to extract the package ID.
	const transaction = await baseClient.getTransaction({
		digest: publicationDigest,
		include: {
			content: true,
			effects: true,
			events: true,
			objectChanges: true,
			objectTypes: true,
		},
	});

	const createdObjects = transaction
		.Transaction!.effects.changedObjects.filter(
			(obj) => obj.idOperation === 'Created' && obj.outputState === 'ObjectWrite',
		)
		.map((x) => {
			return {
				id: x.objectId,
				type: transaction.Transaction!.objectTypes![x.objectId],
			};
		});

	const packageId = transaction.Transaction!.effects.changedObjects.find(
		(obj) => obj.idOperation === 'Created' && obj.outputState === 'PackageWrite',
	)?.objectId;
	if (!packageId) throw new Error('Package ID not found');

	return {
		digest: publicationDigest,
		createdObjects,
		packageId,
	};
}

export async function executeTransaction(toolbox: TestToolbox, tx: Transaction) {
	const resp = await toolbox.client.signAndExecuteTransaction({
		signer: toolbox.keypair,
		transaction: tx,
		include: {
			effects: true,
			events: true,
			objectChanges: true,
		},
	});

	if (!resp.Transaction?.digest) {
		console.dir(resp, { depth: null });
		throw new Error('Transaction digest is missing');
	}

	await toolbox.client.core.waitForTransaction({
		digest: resp.Transaction.digest,
	});

	expect(resp.Transaction?.status.success).toEqual(true);

	return resp;
}

/**
 * Simulate a transaction that is expected to fail, returning the structured
 * error with smart-error messages. Uses `simulateTransaction` (not dry-run
 * budget estimation) so Move aborts surface as `FailedTransaction` responses
 * rather than thrown RPC errors.
 */
export async function simulateFailingTransaction(toolbox: TestToolbox, tx: Transaction) {
	tx.setSenderIfNotSet(toolbox.address());
	await tx.prepareForSerialization({ client: toolbox.client });

	const resp = await toolbox.client.core.simulateTransaction({
		transaction: tx,
		include: { effects: true },
	});

	return resp;
}

export async function simulateTransaction(toolbox: TestToolbox, tx: Transaction) {
	tx.setSender(toolbox.address());
	await tx.prepareForSerialization({ client: toolbox.client });
	return await toolbox.client.core.simulateTransaction({
		transaction: tx,
	});
}

// @ts-ignore-next-line
const SUI_TOOLS_CONTAINER_ID = inject('suiToolsContainerId');

export async function execSuiTools(
	command: string[],
	options?: Parameters<ContainerRuntimeClient['container']['exec']>[2],
) {
	const client = await getContainerRuntimeClient();
	const container = client.container.getById(SUI_TOOLS_CONTAINER_ID);

	const result = await client.container.exec(container, command, options);

	if (result.stderr) console.error(result.stderr);
	// if (result.stdout) console.log(result.stdout);

	return result;
}
