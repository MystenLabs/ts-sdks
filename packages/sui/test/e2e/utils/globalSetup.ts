// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'path';
import {
	GenericContainer,
	getContainerRuntimeClient,
	Network,
	PullPolicy,
	Wait,
} from 'testcontainers';
import type { TestProject } from 'vitest/node';

import type { PrePublishedPackage } from './prePublish.js';
import { prePublishPackages } from './prePublish.js';

declare module 'vitest' {
	export interface ProvidedContext {
		localnetPort: number;
		graphqlPort: number;
		faucetPort: number;
		suiToolsContainerId: string;
		prePublishedPackages: Record<string, PrePublishedPackage>;
	}
}

const SUI_TOOLS_TAG =
	process.env.SUI_TOOLS_TAG ||
	(process.arch === 'arm64'
		? '0804d277859dfe2a2ab3fdbf23b75870d8f0ce6f-arm64'
		: '0804d277859dfe2a2ab3fdbf23b75870d8f0ce6f');

// The preview build includes GraphQL subscriptions; `sui start --with-graphql` does not
// configure the checkpoint stream required by subscriptions.
const GRAPHQL_IMAGE =
	process.env.SUI_GRAPHQL_IMAGE ||
	'mysten/sui-indexer-alt-graphql-preview:102843cdc9b87afebefbf90541f8a4aacb990a04';

export default async function setup(project: TestProject) {
	console.log('Starting test containers');
	const network = await new Network().start();

	const pg = await new GenericContainer('postgres')
		.withEnvironment({
			POSTGRES_USER: 'postgres',
			POSTGRES_PASSWORD: 'postgrespw',
			POSTGRES_DB: 'sui_indexer_v2',
		})
		.withCommand(['-c', 'max_connections=500'])
		.withExposedPorts(5432)
		.withNetwork(network)
		.withPullPolicy(PullPolicy.alwaysPull())
		.start();

	const localnet = await new GenericContainer(`mysten/sui-tools:${SUI_TOOLS_TAG}`)
		// .withPullPolicy(PullPolicy.alwaysPull())
		.withCommand([
			'sui',
			'start',
			'--with-faucet',
			'--force-regenesis',
			'--with-consistent-store',
			`--with-indexer=postgres://postgres:postgrespw@${pg.getIpAddress(network.getName())}:5432/sui_indexer_v2`,
		])
		.withCopyDirectoriesToContainer([
			{ source: resolve(__dirname, '../data'), target: '/test-data' },
		])
		.withNetwork(network)
		.withExposedPorts(9000, 9123, 9124)
		.withStartupTimeout(180_000)
		.withLogConsumer((stream) => {
			stream.on('data', (data) => {
				console.log(data.toString());
			});
		})
		.start();

	const faucetPort = localnet.getMappedPort(9123);
	const localnetPort = localnet.getMappedPort(9000);
	const fullnodeUrl = `http://${localnet.getIpAddress(network.getName())}:9000`;
	let graphqlPort: number;
	let stopGraphQL: (() => void) | undefined;
	if (process.env.SUI_GRAPHQL_BINARY) {
		// Native staging builds avoid amd64 emulation on ARM developer machines.
		graphqlPort = await unusedPort();
		const graphqlProcess = spawn(
			resolve(process.env.SUI_GRAPHQL_BINARY),
			[
				'rpc',
				`--database-url=postgres://postgres:postgrespw@127.0.0.1:${pg.getMappedPort(5432)}/sui_indexer_v2`,
				`--fullnode-rpc-url=http://127.0.0.1:${localnetPort}`,
				`--ledger-grpc-url=http://127.0.0.1:${localnetPort}`,
				'--enable-list-apis=true',
				`--consistent-store-url=http://127.0.0.1:${localnet.getMappedPort(9124)}`,
				`--checkpoint-stream-url=http://127.0.0.1:${localnetPort}`,
				`--rpc-listen-address=127.0.0.1:${graphqlPort}`,
				'--metrics-address=127.0.0.1:0',
				`--indexer-config=${resolve(__dirname, '../data/graphql-indexer.toml')}`,
			],
			{ stdio: 'inherit' },
		);
		stopGraphQL = () => {
			graphqlProcess.kill('SIGTERM');
		};
		process.once('exit', stopGraphQL);
		let startupError: Error | undefined;
		graphqlProcess.once('error', (error) => {
			startupError = error;
		});
		try {
			const deadline = Date.now() + 180_000;
			while (true) {
				if (startupError) throw startupError;
				if (graphqlProcess.exitCode !== null)
					throw new Error('GraphQL process exited during startup');
				try {
					const response = await fetch(`http://127.0.0.1:${graphqlPort}/graphql`, {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ query: '{chainIdentifier}' }),
						signal: AbortSignal.timeout(1000),
					});
					if (response.ok && (await response.json()).data?.chainIdentifier) break;
				} catch {
					/* Wait until the server has its indexed watermarks. */
				}
				if (Date.now() >= deadline) throw new Error('GraphQL startup timed out');
				await new Promise((resolve) => setTimeout(resolve, 250));
			}
		} catch (error) {
			stopGraphQL();
			throw error;
		}
	} else {
		const graphql = await new GenericContainer(GRAPHQL_IMAGE)
			// The published preview image is amd64, including on ARM developer machines.
			.withPlatform(process.env.SUI_GRAPHQL_PLATFORM || 'linux/amd64')
			.withCommand([
				'sui-indexer-alt-graphql',
				'rpc',
				`--database-url=postgres://postgres:postgrespw@${pg.getIpAddress(network.getName())}:5432/sui_indexer_v2`,
				`--fullnode-rpc-url=${fullnodeUrl}`,
				`--ledger-grpc-url=${fullnodeUrl}`,
				'--enable-list-apis=true',
				`--consistent-store-url=http://${localnet.getIpAddress(network.getName())}:9124`,
				`--checkpoint-stream-url=${fullnodeUrl}`,
				'--rpc-listen-address=0.0.0.0:9125',
				'--indexer-config=/graphql-indexer.toml',
			])
			.withNetwork(network)
			.withCopyFilesToContainer([
				{
					source: resolve(__dirname, '../data/graphql-indexer.toml'),
					target: '/graphql-indexer.toml',
				},
			])
			.withExposedPorts(9125)
			.withWaitStrategy(Wait.forListeningPorts())
			.withStartupTimeout(180_000)
			.withLogConsumer((stream) => stream.on('data', (data) => console.log(data.toString())))
			.start();
		graphqlPort = graphql.getMappedPort(9125);
	}
	const containerId = localnet.getId();

	// Set up the default sui config so `sui keytool` and `sui move build` commands work.
	// The config file is checked in at data/localnet-client.yaml and copied into the container.
	const runtimeClient = await getContainerRuntimeClient();
	const container = runtimeClient.container.getById(containerId);
	await runtimeClient.container.exec(container, ['mkdir', '-p', '/root/.sui/sui_config']);
	await runtimeClient.container.exec(container, [
		'bash',
		'-c',
		"echo '[]' > /root/.sui/sui_config/sui.keystore && cp /test-data/localnet-client.yaml /root/.sui/sui_config/client.yaml",
	]);

	project.provide('faucetPort', faucetPort);
	project.provide('localnetPort', localnetPort);
	project.provide('graphqlPort', graphqlPort);
	project.provide('suiToolsContainerId', containerId);

	// Pre-publish shared packages
	const prePublished = await prePublishPackages({
		fullnodeUrl: `http://127.0.0.1:${localnetPort}`,
		faucetUrl: `http://127.0.0.1:${faucetPort}`,
		containerId,
	});
	project.provide('prePublishedPackages', prePublished);
	return () => {
		if (stopGraphQL) {
			process.removeListener('exit', stopGraphQL);
			stopGraphQL();
		}
	};
}

async function unusedPort(): Promise<number> {
	const server = createServer();
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Failed to allocate GraphQL port');
	await new Promise<void>((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve())),
	);
	return address.port;
}
