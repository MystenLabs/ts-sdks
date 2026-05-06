// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { accessLevel } from './accessLevel.js';
import { balanceFlows } from './balance-flows.js';
import { coinFlows } from './coin-flows.js';
import { coinValues } from './coin-value.js';
import { coins, gasCoins } from './coins.js';
import { commands } from './commands.js';
import { balanceChanges, bytes, data, digest, transactionResponse } from './core.js';
import { moveFunctions } from './functions.js';
import { inputs } from './inputs.js';
import { objectIds, objects, objectsById, ownedObjects } from './objects.js';

export const analyzers: {
	accessLevel: typeof accessLevel;
	balanceChanges: typeof balanceChanges;
	balanceFlows: typeof balanceFlows;
	bytes: typeof bytes;
	coinFlows: typeof coinFlows;
	coins: typeof coins;
	coinValues: typeof coinValues;
	commands: typeof commands;
	data: typeof data;
	digest: typeof digest;
	transactionResponse: typeof transactionResponse;
	gasCoins: typeof gasCoins;
	inputs: typeof inputs;
	moveFunctions: typeof moveFunctions;
	objectIds: typeof objectIds;
	objects: typeof objects;
	objectsById: typeof objectsById;
	ownedObjects: typeof ownedObjects;
} = {
	accessLevel,
	balanceChanges,
	balanceFlows,
	bytes,
	coinFlows,
	coins,
	coinValues,
	commands,
	data,
	digest,
	transactionResponse,
	gasCoins,
	inputs,
	moveFunctions,
	objectIds,
	objects,
	objectsById,
	ownedObjects,
};
