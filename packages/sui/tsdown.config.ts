// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: [
		'src/bcs/index.ts',
		'src/client/index.ts',
		'src/cryptography/index.ts',
		'src/faucet/index.ts',
		'src/graphql/index.ts',
		'src/graphql/schema/index.ts',
		'src/grpc/index.ts',
		'src/jsonRpc/index.ts',
		'src/keypairs/ed25519/index.ts',
		'src/keypairs/secp256k1/index.ts',
		'src/keypairs/secp256r1/index.ts',
		'src/keypairs/passkey/index.ts',
		'src/multisig/index.ts',
		'src/transactions/index.ts',
		'src/utils/index.ts',
		'src/verify/index.ts',
		'src/zklogin/index.ts',
	],
	format: ['esm', 'cjs'],
	dts: true,
	outDir: 'dist',
	unbundle: true,
});
