// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';

import { SuiGasData } from '../../../../src/jsonRpc/index.js';
import { setup, TestToolbox } from '../../utils/setup.js';

describe('Invoke any RPC endpoint', () => {
	let toolbox: TestToolbox;

	beforeAll(async () => {
		toolbox = await setup();
	});

	it('suix_getOwnedObjects', async () => {
		const gasObjectsExpected = await toolbox.jsonRpcClient.getOwnedObjects({
			owner: toolbox.address(),
		});
		const gasObjects = await toolbox.jsonRpcClient.call<{ data: SuiGasData }>(
			'suix_getOwnedObjects',
			[toolbox.address()],
		);
		expect(gasObjects.data).toStrictEqual(gasObjectsExpected.data);
	});

	it('sui_getObjectOwnedByAddress Error', async () => {
		await expect(toolbox.jsonRpcClient.call('suix_getOwnedObjects', [])).rejects.toThrowError();
	});

	it('suix_getCommitteeInfo', async () => {
		const committeeInfoExpected = await toolbox.jsonRpcClient.getCommitteeInfo();

		const committeeInfo = await toolbox.jsonRpcClient.call('suix_getCommitteeInfo', []);

		expect(committeeInfo).toStrictEqual(committeeInfoExpected);
	});
});
