// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl, SuiClient } from './client/index.js';

const client = new SuiClient({
	url: getFullnodeUrl('testnet'),
});

client
	.getNormalizedMoveModulesByPackage({
		package: '0xa3886aaa8aa831572dd39549242ca004a438c3a55967af9f0387ad2b01595068',
	})
	.then((res) => {
		console.dir(res, { depth: null });
	});
