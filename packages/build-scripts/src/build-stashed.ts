#! /usr/bin/env tsx
// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { buildPackage } from './utils/buildPackage.js';

const pkg = require('../../stashed/package.json');

buildPackage({
	define: {
		__PKG_VERSION__: JSON.stringify(pkg.version),
	},
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
