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

const SUI_TOOLS_TAG =
	process.env.SUI_TOOLS_TAG ||
	(process.arch === 'arm64'
		? '08500756541c6fd66c81a59d1af1d819e997a189-arm64'
		: '08500756541c6fd66c81a59d1af1d819e997a189');

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
			'--with-graphql',
			`--with-indexer=postgres://postgres:postgrespw@${pg.getIpAddress(network.getName())}:5432/sui_indexer_v2`,
		])
		.withCopyDirectoriesToContainer([
			{ source: resolve(__dirname, '../data'), target: '/test-data' },
		])
		.withNetwork(network)
		.withExposedPorts(9000, 9123, 9124, 9125)
		.withLogConsumer((stream) => {
			stream.on('data', (data) => {
				console.log(data.toString());
			});
		})
		.start();

	const faucetPort = localnet.getMappedPort(9123);
	const localnetPort = localnet.getMappedPort(9000);
	const graphqlPort = localnet.getMappedPort(9125);
	const containerId = localnet.getId();

	// Create default sui config so `sui keytool` commands work in the container.
	// This must happen once before any tests run to avoid race conditions.
	const runtimeClient = await getContainerRuntimeClient();
	const container = runtimeClient.container.getById(containerId);
	await runtimeClient.container.exec(container, ['mkdir', '-p', '/root/.sui/sui_config']);
	await runtimeClient.container.exec(container, [
		'bash',
		'-c',
		`echo '[]' > /root/.sui/sui_config/sui.keystore && cat > /root/.sui/sui_config/client.yaml << 'EOF'
---
keystore:
  File: /root/.sui/sui_config/sui.keystore
envs:
  - alias: localnet
    rpc: "http://127.0.0.1:9000"
    ws: ~
active_env: localnet
active_address: "0x0000000000000000000000000000000000000000000000000000000000000000"
EOF`,
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
