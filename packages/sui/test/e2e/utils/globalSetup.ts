// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'path';
import { GenericContainer, getContainerRuntimeClient, Network, PullPolicy } from 'testcontainers';
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

const DEFAULT_SUI_TOOLS_TAG = '681aca4f69868d4eeca02221ced361b8288211e6';

export default async function setup(project: TestProject) {
	// The image must match the Docker host's architecture, which can differ from Node's.
	const runtime = await getContainerRuntimeClient();
	const arm = /^(arm64|aarch64)/.test(runtime.info.containerRuntime.architecture);
	const suiToolsTag =
		process.env.SUI_TOOLS_TAG || (arm ? `${DEFAULT_SUI_TOOLS_TAG}-arm64` : DEFAULT_SUI_TOOLS_TAG);
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

	const localnet = await new GenericContainer(`mysten/sui-tools:${suiToolsTag}`)
		.withCommand([
			'sui',
			'start',
			'--with-faucet',
			'--force-regenesis',
			'--with-graphql',
			`--with-indexer=postgres://postgres:postgrespw@${pg.getIpAddress(network.getName())}:5432/sui_indexer_v2`,
		])
		.withCopyDirectoriesToContainer([
			{ source: resolve(__dirname, '../data'), target: '/test-data' },
		])
		.withNetwork(network)
		.withExposedPorts(9000, 9123, 9125)
		.withStartupTimeout(180_000)
		.withLogConsumer((stream) => {
			stream.on('data', (data) => {
				console.log(data.toString());
			});
		})
		.start();

	const faucetPort = localnet.getMappedPort(9123);
	const localnetPort = localnet.getMappedPort(9000);
	const graphqlPort = localnet.getMappedPort(9125);
	await waitForGraphQL(graphqlPort);
	const containerId = localnet.getId();

	// Set up the default sui config so `sui keytool` and `sui move build` commands work.
	// The config file is checked in at data/localnet-client.yaml and copied into the container.
	const container = runtime.container.getById(containerId);
	await runtime.container.exec(container, ['mkdir', '-p', '/root/.sui/sui_config']);
	await runtime.container.exec(container, [
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
}

/** Waits until GraphQL answers a query with its indexed data. */
async function waitForGraphQL(port: number) {
	const deadline = Date.now() + 60_000;
	while (true) {
		try {
			const response = await fetch(`http://127.0.0.1:${port}/graphql`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ query: '{chainIdentifier}' }),
				signal: AbortSignal.timeout(1000),
			});
			if (response.ok && (await response.json()).data?.chainIdentifier) return;
		} catch {
			/* Not serving yet. */
		}
		if (Date.now() >= deadline) throw new Error('GraphQL startup timed out');
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
}
