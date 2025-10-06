// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useLocalStorageString, useLocalStorageBoolean } from './useLocalStorage.js';
import { useState } from 'react';

export interface TransferFormData {
	recipient: string;
	amount: string;
	transferAll: boolean;
	selectedCoinType: string;
	selectedObjectIds: string[];
}

export interface TransferFormActions {
	setRecipient: (value: string) => void;
	setAmount: (value: string) => void;
	setTransferAll: (value: boolean) => void;
	setSelectedCoinType: (value: string) => void;
	setSelectedObjectIds: (value: string[]) => void;
	clearForm: () => void;
}

export function useTransferForm(): [TransferFormData, TransferFormActions] {
	const [recipient, setRecipient] = useLocalStorageString('transfer-recipient', '');
	const [amount, setAmount] = useLocalStorageString('transfer-amount', '');
	const [transferAll, setTransferAll] = useLocalStorageBoolean('transfer-all', false);
	const [selectedCoinType, setSelectedCoinType] = useLocalStorageString(
		'transfer-coin-type',
		'0x2::sui::SUI',
	);
	const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);

	const formData: TransferFormData = {
		recipient,
		amount,
		transferAll,
		selectedCoinType,
		selectedObjectIds,
	};

	const actions: TransferFormActions = {
		setRecipient,
		setAmount,
		setTransferAll,
		setSelectedCoinType,
		setSelectedObjectIds,
		clearForm: () => {
			setRecipient('');
			setAmount('');
			setTransferAll(false);
			setSelectedCoinType('0x2::sui::SUI');
			setSelectedObjectIds([]);
		},
	};

	return [formData, actions];
}
