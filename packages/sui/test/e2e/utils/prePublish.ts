// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ContainerRuntimeClient } from 'testcontainers';
import { getContainerRuntimeClient } from 'testcontainers';
import { retry } from 'ts-retry-promise';

import { Ed25519Keypair } from '../../../src/keypairs/ed25519/index.js';
import { requestSuiFromFaucetV2, FaucetRateLimitError } from '../../../src/faucet/index.js';
import { Transaction } from '../../../src/transactions/index.js';
import { normalizeSuiAddress } from '../../../src/utils/index.js';
import { SuiGrpcClient } from '../../../src/grpc/client.js';

export interface PrePublishedPackage {
	packageId: string;
	sharedObjects?: Record<string, string>; // typeName -> objectId
	publisherAddress: string;
	publisherObjectId?: string;
}

export interface PrePublishConfig {
	fullnodeUrl: string;
	faucetUrl: string;
	containerId: string;
}

export const PACKAGES_TO_PREPUBLISH = ['shared/test_data'];

export async function prePublishPackages(
	config: PrePublishConfig,
): Promise<Record<string, PrePublishedPackage>> {
	const results: Record<string, PrePublishedPackage> = {};

	console.log('Pre-publishing Move packages...');

	const keypair = Ed25519Keypair.generate();
	const address = keypair.getPublicKey().toSuiAddress();

	const client = new SuiGrpcClient({
		network: 'localnet',
		baseUrl: config.fullnodeUrl,
	});

	// Fund the keypair
	await retry(
		async () =>
			await requestSuiFromFaucetV2({
				host: config.faucetUrl,
				recipient: address,
			}),
		{
			backoff: 'EXPONENTIAL',
			timeout: 60000,
			retryIf: (error: unknown) => !(error instanceof FaucetRateLimitError),
			logger: (msg) => console.warn('Retrying faucet request: ' + msg),
		},
	);

	// Wait for funds to be available
	await retry(
		async () => {
			const { balance } = await client.core.getBalance({
				owner: address,
				coinType: '0x2::sui::SUI',
			});
			if (balance.balance === '0') {
				throw new Error('Balance is still 0');
			}
		},
		{
			backoff: () => 3000,
			timeout: 60000,
			retryIf: () => true,
		},
	);

	const containerClient = await getContainerRuntimeClient();

	const configPath = '/test-data/prepublish-client.yaml';
	await execInContainer(containerClient, config.containerId, [
		'sui',
		'client',
		'--yes',
		'--client.config',
		configPath,
	]);

	// Publish each package
	for (const packagePath of PACKAGES_TO_PREPUBLISH) {
		try {
			const result = await publishSinglePackage({
				packagePath,
				keypair,
				client,
				containerClient,
				containerId: config.containerId,
				configPath,
			});

			// Store with simplified name (e.g., "shared/serializer" -> "serializer")
			const simpleName = packagePath.replace('shared/', '');
			results[simpleName] = result;

			console.log(`Pre-published ${simpleName}: ${result.packageId}`);

			// Set up Display v2 for test_data's DemoBear so gRPC can return display data
			if (simpleName === 'test_data' && result.publisherObjectId) {
				try {
					await setupDemoBearDisplayV2({
						packageId: result.packageId,
						publisherObjectId: result.publisherObjectId,
						keypair,
						client,
						address,
					});
				} catch (error) {
					console.warn(`  Warning: Failed to set up Display v2: ${error}`);
				}
			}
			if (result.sharedObjects && Object.keys(result.sharedObjects).length > 0) {
				console.log(`  Shared objects: ${JSON.stringify(result.sharedObjects)}`);
			}
		} catch (error) {
			console.error(`Failed to pre-publish ${packagePath}:`, error);
			// Continue with other packages - tests can fall back to per-test publishing
		}
	}

	console.log(
		`Pre-published ${Object.keys(results).length}/${PACKAGES_TO_PREPUBLISH.length} packages`,
	);

	return results;
}

async function publishSinglePackage(options: {
	packagePath: string;
	keypair: Ed25519Keypair;
	client: SuiGrpcClient;
	containerClient: ContainerRuntimeClient;
	containerId: string;
	configPath: string;
}): Promise<PrePublishedPackage> {
	const { packagePath, keypair, client, containerClient, containerId, configPath } = options;
	const address = keypair.getPublicKey().toSuiAddress();

	// Build the package
	const buildResult = await execInContainer(containerClient, containerId, [
		'sui',
		'move',
		'--client.config',
		configPath,
		'build',
		'--dump-bytecode-as-base64',
		'--path',
		`/test-data/${packagePath}`,
	]);

	if (!buildResult.stdout.includes('{')) {
		throw new Error(`Failed to build ${packagePath}: ${buildResult.stdout} ${buildResult.stderr}`);
	}

	// Parse build output
	let buildOutput;
	try {
		buildOutput = JSON.parse(
			buildResult.stdout.slice(
				buildResult.stdout.indexOf('{'),
				buildResult.stdout.lastIndexOf('}') + 1,
			),
		);
	} catch (error) {
		throw new Error(`Failed to parse build output for ${packagePath}: ${error}`);
	}

	const { modules, dependencies } = buildOutput;

	// Create and execute publish transaction
	const tx = new Transaction();
	const cap = tx.publish({ modules, dependencies });
	tx.transferObjects([cap], tx.pure.address(address));

	const result = await keypair.signAndExecuteTransaction({
		transaction: tx,
		client,
	});

	const publishTxn = await client.waitForTransaction({
		result,
		include: { effects: true, objectTypes: true },
	});

	if (publishTxn.FailedTransaction) {
		throw new Error(
			`Publish transaction failed for ${packagePath}: ${publishTxn.FailedTransaction.status.error?.message}`,
		);
	}

	const effects = publishTxn.Transaction.effects!;
	const objectTypes = publishTxn.Transaction.objectTypes ?? {};

	// Extract package ID from changedObjects where outputState is PackageWrite
	const publishedChange = effects.changedObjects.find((o) => o.outputState === 'PackageWrite');

	if (!publishedChange) {
		throw new Error(`No published package found in transaction for ${packagePath}`);
	}

	const packageId = normalizeSuiAddress(publishedChange.objectId);

	// Extract shared objects created in init
	const sharedObjects: Record<string, string> = {};
	const sharedCreated = effects.changedObjects.filter(
		(o) => o.idOperation === 'Created' && o.outputOwner?.$kind === 'Shared',
	);

	// Use objectTypes from transaction response to get type info
	for (const change of sharedCreated) {
		const fullType = objectTypes[change.objectId];
		if (!fullType) continue;

		// Extract a meaningful type key for different object types:
		// - Simple: "0x...::module::TypeName" -> "TypeName"
		// - Generic: "0x2::coin::TreasuryCap<0x...::test::TEST>" -> "TreasuryCap<TEST>"

		// Check for generic types (contain '<')
		const genericMatch = fullType.match(/::(\w+)<.*::(\w+)>$/);
		if (genericMatch) {
			// For generics like TreasuryCap<PKG::test::TEST>, use "TreasuryCap<TEST>"
			sharedObjects[`${genericMatch[1]}<${genericMatch[2]}>`] = change.objectId;
		} else {
			// For simple types, use the last component
			const typeName = fullType.split('::').pop();
			if (typeName) {
				sharedObjects[typeName] = change.objectId;
			}
		}
	}

	const publisherObject = effects.changedObjects.find((o) => {
		const type = objectTypes[o.objectId];
		return o.idOperation === 'Created' && type != null && type.includes('::package::Publisher');
	});

	return {
		packageId,
		sharedObjects: Object.keys(sharedObjects).length > 0 ? sharedObjects : undefined,
		publisherAddress: address,
		publisherObjectId: publisherObject?.objectId,
	};
}

const DEMO_BEAR_IMAGE_URL =
	'https://images.unsplash.com/photo-1589656966895-2f33e7653819?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cG9sYXIlMjBiZWFyfGVufDB8fDB8fHww';

async function setupDemoBearDisplayV2(options: {
	packageId: string;
	publisherObjectId: string;
	keypair: Ed25519Keypair;
	client: SuiGrpcClient;
	address: string;
}): Promise<void> {
	const { packageId, publisherObjectId, keypair, client, address } = options;
	const DISPLAY_REGISTRY_ID = normalizeSuiAddress('0xd');
	const BEAR_TYPE = `${packageId}::demo_bear::DemoBear`;

	const tx = new Transaction();
	const registry = tx.object(DISPLAY_REGISTRY_ID);
	const publisher = tx.object(publisherObjectId);

	const [display, cap] = tx.moveCall({
		target: '0x2::display_registry::new_with_publisher',
		typeArguments: [BEAR_TYPE],
		arguments: [registry, publisher],
	});

	for (const [key, value] of [
		['name', '{name}'],
		['image_url', DEMO_BEAR_IMAGE_URL],
		['description', 'The greatest figure for demos'],
	]) {
		tx.moveCall({
			target: '0x2::display_registry::set',
			typeArguments: [BEAR_TYPE],
			arguments: [display, cap, tx.pure.string(key), tx.pure.string(value)],
		});
	}

	tx.moveCall({
		target: '0x2::display_registry::share',
		typeArguments: [BEAR_TYPE],
		arguments: [display],
	});

	tx.transferObjects([cap], tx.pure.address(address));

	const result = await keypair.signAndExecuteTransaction({
		transaction: tx,
		client,
	});

	const txn = await client.waitForTransaction({
		result,
		include: { effects: true },
	});

	if (txn.FailedTransaction) {
		throw new Error(
			`Display v2 setup failed: ${txn.FailedTransaction.status.error?.message}`,
		);
	}

	console.log(`  Set up Display v2 for ${BEAR_TYPE}`);
}

async function execInContainer(
	containerClient: ContainerRuntimeClient,
	containerId: string,
	command: string[],
) {
	const container = containerClient.container.getById(containerId);
	const result = await containerClient.container.exec(container, command);

	if (result.stderr) {
		console.log(result.stderr);
	}

	return result;
}
