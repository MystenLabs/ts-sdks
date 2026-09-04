// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TransactionDataBuilder } from './TransactionData.js';

export function transactionUsesGasCoin(transactionData: TransactionDataBuilder) {
	let usesGasCoin = false;

	transactionData.mapArguments((arg) => {
		if (arg.$kind === 'GasCoin') {
			usesGasCoin = true;
		}

		return arg;
	});

	return usesGasCoin;
}
