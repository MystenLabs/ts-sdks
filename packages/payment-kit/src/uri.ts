// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isValidNamedType, isValidSuiAddress, isValidSuiObjectId } from '@mysten/sui/utils';
import type { PaymentUriParams } from './types.js';
import { PaymentKitUriError } from './error.js';
import { SUI_PAYMENT_KIT_PROTOCOL } from './constants.js';

const isValidNonce = (nonce: string) => {
	return nonce.length <= 36;
};

const isValidAmount = (amount: bigint) => {
	return amount > 0n;
};

const isValidCoinType = (coinType: string) => {
	return isValidNamedType(coinType);
};

/**
 * Create a payment transaction URI from the given parameters.
 * Returns the constructed URI string.
 *
 * @example
 * ```ts
 * const uri = createPaymentTransactionUri({
 *   receiverAddress: "0x...",
 *   amount: "10000000", (0.01 SUI)
 *   coinType: "0x2::sui::SUI",
 *   nonce: <nonce>,
 *   registryName: "my-registry"
 * });
 * ```
 */
export const createPaymentTransactionUri = (params: PaymentUriParams): string => {
	const { receiverAddress, amount, coinType, nonce, registryId, registryName } = params;

	const uri = new URL(SUI_PAYMENT_KIT_PROTOCOL);

	if (!isValidSuiAddress(receiverAddress)) {
		uri.searchParams.append('receiver', amount.toString());
	} else {
		throw new PaymentKitUriError('Invalid Sui address');
	}

	if (isValidAmount(amount)) {
		uri.searchParams.append('amount', amount.toString());
	} else {
		throw new PaymentKitUriError('Amount must be a positive numeric string');
	}

	if (isValidCoinType(coinType)) {
		uri.searchParams.append('coinType', coinType);
	} else {
		throw new PaymentKitUriError('Invalid Coin Type');
	}

	if (isValidNonce(nonce)) {
		uri.searchParams.append('nonce', nonce);
	} else {
		throw new PaymentKitUriError('Nonce length exceeds maximum of 36 characters');
	}

	if (registryId) {
		if (isValidSuiObjectId(registryId)) {
			uri.searchParams.append('registry', registryId);
		} else {
			throw new PaymentKitUriError('Invalid Sui Object Id for Registry Id');
		}
	}

	if (registryName) {
		uri.searchParams.append('registry', registryName);
	}

	if (params.label) {
		uri.searchParams.append('label', params.label);
	}

	if (params.message) {
		uri.searchParams.append('message', params.message);
	}

	if (params.iconUrl) {
		uri.searchParams.append('iconUrl', params.iconUrl);
	}

	return uri.toString();
};

/**
 * Parse a payment transaction URI into its components.
 * Returns the parsed payment URI parameters.
 *
 * @example
 * ```ts
 * const params = parsePaymentTransactionUri("sui:0x...?amount=1000000&coinType=0x...&nonce=...");
 * ```
 */
export const parsePaymentTransactionUri = (uri: string): PaymentUriParams => {
	if (!uri.startsWith(SUI_PAYMENT_KIT_PROTOCOL + '?')) {
		throw new PaymentKitUriError('Invalid URI: Must start with sui:pay?');
	}

	const url = new URL(uri);

	// Extract query parameters
	const params = url.searchParams;
	const receiver = params.get('receiver');
	const amount = params.get('amount');
	const coinType = params.get('coinType');
	const nonce = params.get('nonce') ?? undefined;

	// Amount and CoinType are required
	if (!receiver || !amount || !coinType || !nonce) {
		throw new PaymentKitUriError('Invalid URI: Missing required parameters');
	}

	// Validate the receiver address
	if (!isValidSuiAddress(receiver)) {
		throw new PaymentKitUriError('Invalid URI: Receiver address is not valid');
	}

	if (!isValidCoinType(coinType)) {
		throw new PaymentKitUriError('Invalid URI: Coin Type is not valid');
	}

	if (!isValidNonce(nonce)) {
		throw new PaymentKitUriError('Invalid URI: Nonce length exceeds maximum of 36 characters');
	}

	// Validate amount is a valid numeric string (int or float) and positive
	const bigIntAmount = BigInt(amount);
	if (!isValidAmount(bigIntAmount)) {
		throw new PaymentKitUriError('Invalid URI: Amount must be a positive number');
	}

	// Extract optional registry parameter
	const registry = params.get('registry') ?? undefined;

	// Determine if registry is an ID or name
	let registryId: string | undefined;
	let registryName: string | undefined;

	if (registry) {
		if (isValidSuiObjectId(registry)) {
			registryId = registry;
		} else {
			registryName = registry;
		}
	}

	const baseParams = {
		receiverAddress: receiver,
		amount: bigIntAmount,
		coinType,
		nonce: nonce,
		label: params.get('label') ?? undefined,
		message: params.get('message') ?? undefined,
		iconUrl: params.get('icon') ?? undefined,
	};

	if (registryId) {
		return { ...baseParams, registryId };
	}

	return { ...baseParams, registryName };
};
