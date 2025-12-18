#!/usr/bin/env node
// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { proposeCompletions } from '@stricli/core';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildContext } from '../cli/context.js';
import { buildCli } from '../cli/cli.js';

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

export async function main() {
	const version = await getVersion();
	const cli = buildCli(version);

	const inputs = process.argv.slice(3);
	if (process.env['COMP_LINE']?.endsWith(' ')) {
		inputs.push('');
	}

	try {
		for (const { completion } of await proposeCompletions(cli, inputs, buildContext(process))) {
			process.stdout.write(`${completion}\n`);
		}
	} catch {
		// ignore
	}
}

main().then(
	() => process.exit(0),
	(error) => {
		console.error(error);
		process.exit(1);
	},
);
