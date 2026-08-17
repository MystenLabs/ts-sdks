// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

class LatestFirmwareVersionRequired extends Error {
	override name = 'LatestFirmwareVersionRequired';
}

class UpdateYourApp extends Error {
	override name = 'UpdateYourApp';
	managerAppName?: string;

	constructor(message?: string, fields?: { managerAppName?: string }, options?: ErrorOptions) {
		super(message || 'UpdateYourApp', options);
		this.managerAppName = fields?.managerAppName;
	}
}

export { LatestFirmwareVersionRequired, UpdateYourApp };
