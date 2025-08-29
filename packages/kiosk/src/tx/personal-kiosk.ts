// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';

import type { ObjectArgument } from '../types/index.js';

export interface ConvertToPersonalKioskParams {
	kiosk: ObjectArgument;
	kioskOwnerCap: ObjectArgument;
	packageId: string;
}

export function convertToPersonal(params: ConvertToPersonalKioskParams) {
	return (tx: Transaction) => {
		const personalKioskCap = tx.moveCall({
			target: `${params.packageId}::personal_kiosk::new`,
			arguments: [tx.object(params.kiosk), tx.object(params.kioskOwnerCap)],
		});

		return personalKioskCap;
	};
}

export interface TransferPersonalCapParams {
	personalKioskCap: TransactionObjectArgument;
	packageId: string;
}

/**
 * Transfers the personal kiosk Cap to the sender.
 */
export function transferPersonalCap(params: TransferPersonalCapParams) {
	return (tx: Transaction) => {
		tx.moveCall({
			target: `${params.packageId}::personal_kiosk::transfer_to_sender`,
			arguments: [tx.object(params.personalKioskCap)],
		});
	};
}
