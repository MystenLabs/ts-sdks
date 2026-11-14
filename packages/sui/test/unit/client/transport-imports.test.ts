// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const src = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src');

// Keypair and public key code that `client.core.verifySignature` must not pull in.
const HEAVY =
	/^(keypairs\/|multisig\/|verify\/|cryptography\/(publickey|signature|keypair)\.ts|zklogin\/(publickey|signer|poseidon|address-seed)\.ts)/;

/** Relative files reachable through value imports (type-only imports are erased). */
function reachable(entry: string) {
	const seen = new Set<string>();
	const queue = [resolve(src, entry)];
	while (queue.length) {
		const file = queue.pop()!;
		if (seen.has(file)) continue;
		seen.add(file);
		const code = readFileSync(file, 'utf8').replace(
			/(?:import|export)\s+type\s[^;]*?from\s*['"][^'"]+['"]/g,
			'',
		);
		for (const [, path] of code.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
			queue.push(resolve(dirname(file), path.replace(/\.js$/, '.ts')));
		}
	}
	return [...seen].map((file) => relative(src, file));
}

describe('transport imports', () => {
	it.each(['grpc/index.ts', 'graphql/index.ts'])('%s loads no keypair code', (entry) => {
		expect(reachable(entry).filter((file) => HEAVY.test(file))).toEqual([]);
	});
});
