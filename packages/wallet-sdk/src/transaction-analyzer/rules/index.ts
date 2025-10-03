// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { accessLevel } from './accessLevel.js';
import { coinFlows } from './coin-flows.js';
import { coinValues } from './coin-value.js';
import { coins, gasCoins } from './coins.js';
import { commands } from './commands.js';
import { balanceChanges, bytes, data, digest, transactionResponse } from './core.js';
import { moveFunctions } from './functions.js';
import { inputs } from './inputs.js';
import { objectIds, objects, objectsById, ownedObjects } from './objects.js';

export const analyzers = {
	accessLevel,
	balanceChanges,
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
