#!/usr/bin/env node
// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { run } from '@stricli/core';
import { buildContext } from '../cli/context.js';
import { buildCli } from '../cli/cli.js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function getVersion() {
	// @ts-ignore
	const dirname = import.meta.dirname;

	const packageJsonPath = resolve(
		dirname,
		dirname.endsWith('src/bin') ? '../../package.json' : '../../package.json',
	);
	const packageJson: { version: string } = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
	return packageJson.version;
}

async function main() {
	const version = await getVersion();
	await run(buildCli(version), process.argv.slice(2), buildContext(process));
}

main().then(
	() => process.exit(0),
	(error) => {
		console.error(error);
		process.exit(1);
	},
);
