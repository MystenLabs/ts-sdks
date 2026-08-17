// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { openTransportReplayer, RecordStore } from '@ledgerhq/hw-transport-mocker';
import { expect, test } from 'vitest';

import Sui from '../src/Sui.js';
import { LatestFirmwareVersionRequired, UpdateYourApp } from '../src/errors.js';

test('Sui init', async () => {
	const transport = await openTransportReplayer(RecordStore.fromString(''));
	const pkt = new Sui(transport);
	expect(pkt).not.toBe(undefined);
});

test('preserves the observable Ledger error shape', () => {
	const firmwareError = new LatestFirmwareVersionRequired('LatestFirmwareVersionRequired');
	const appError = new UpdateYourApp(undefined, { managerAppName: 'Sui' });

	expect(firmwareError).toBeInstanceOf(Error);
	expect(firmwareError).toMatchObject({
		name: 'LatestFirmwareVersionRequired',
		message: 'LatestFirmwareVersionRequired',
	});
	expect(appError).toBeInstanceOf(Error);
	expect(appError).toMatchObject({
		name: 'UpdateYourApp',
		message: 'UpdateYourApp',
		managerAppName: 'Sui',
	});
});
