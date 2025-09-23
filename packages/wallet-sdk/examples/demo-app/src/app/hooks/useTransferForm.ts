// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useLocalStorageString, useLocalStorageBoolean } from './useLocalStorage.js';

export interface TransferFormData {
	recipient: string;
	amount: string;
	transferAll: boolean;
	selectedCoinType: string;
}

export interface TransferFormActions {
	setRecipient: (value: string) => void;
	setAmount: (value: string) => void;
	setTransferAll: (value: boolean) => void;
	setSelectedCoinType: (value: string) => void;
	clearForm: () => void;
}

export function useTransferForm(): [TransferFormData, TransferFormActions] {
	const [recipient, setRecipient] = useLocalStorageString('transfer-recipient', '');
	const [amount, setAmount] = useLocalStorageString('transfer-amount', '');
	const [transferAll, setTransferAll] = useLocalStorageBoolean('transfer-all', false);
	const [selectedCoinType, setSelectedCoinType] = useLocalStorageString('transfer-coin-type', '0x2::sui::SUI');

	const formData: TransferFormData = {
		recipient,
		amount,
		transferAll,
		selectedCoinType,
	};

	const actions: TransferFormActions = {
		setRecipient,
		setAmount,
		setTransferAll,
		setSelectedCoinType,
		clearForm: () => {
			setRecipient('');
			setAmount('');
			setTransferAll(false);
			setSelectedCoinType('0x2::sui::SUI');
		},
	};

	return [formData, actions];
}