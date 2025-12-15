// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';

import { setup, TestToolbox } from '../../utils/setup';

describe('Test Coin Metadata', () => {
	let toolbox: TestToolbox;
	let packageId: string;

	beforeAll(async () => {
		toolbox = await setup();
		packageId = await toolbox.getPackage('coin_metadata', { normalized: false });
	});

	it('Test accessing coin metadata', async () => {
		const coinMetadata = (await toolbox.jsonRpcClient.getCoinMetadata({
			coinType: `${packageId}::test::TEST`,
		}))!;
		expect(coinMetadata.decimals).to.equal(2);
		expect(coinMetadata.name).to.equal('Test Coin');
		expect(coinMetadata.description).to.equal('Test coin metadata');
		expect(coinMetadata.iconUrl).to.equal('http://sui.io');
	});
});
