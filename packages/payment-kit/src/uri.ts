// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isValidNamedType, isValidSuiAddress, isValidSuiObjectId } from '@mysten/sui/utils';
import type { PaymentUriParams } from './types.js';
import { PaymentKitUriError } from './error.js';
import { SUI_PROTOCOL } from './constants.js';

const validateNonce = (nonce: string) => {
	return nonce.length <= 36;
};

const validateAmount = (amount: bigint) => {
	return amount > 0n;
};

const validateCoinType = (coinType: string) => {
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
	const { receiverAddress: address, amount, coinType, nonce, registryId, registryName } = params;

	if (!isValidSuiAddress(address)) {
		throw new PaymentKitUriError('Invalid Sui address');
	}

	const uri = new URL(SUI_PROTOCOL + address);

	if (validateAmount(amount)) {
		uri.searchParams.append('amount', amount.toString());
	} else {
		throw new PaymentKitUriError('Amount must be a positive numeric string');
	}

	if (validateCoinType(coinType)) {
		uri.searchParams.append('coinType', coinType);
	} else {
		throw new PaymentKitUriError('Invalid Coin Type');
	}

	if (validateNonce(nonce)) {
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
	if (!uri.startsWith('sui:')) {
		throw new PaymentKitUriError('Invalid URI: Must start with sui:');
	}

	const url = new URL(uri);
	const address = url.pathname.replace('/', '');

	// Validate the address
	if (!isValidSuiAddress(address)) {
		throw new PaymentKitUriError('Invalid Sui address');
	}

	// Extract query parameters
	const params = url.searchParams;
	const amount = params.get('amount');
	const coinType = params.get('coinType');
	const nonce = params.get('nonce') || undefined;

	// Amount and CoinType are required
	if (!amount || !coinType || !nonce) {
		throw new PaymentKitUriError('Invalid URI: Missing required parameters');
	}

	if (!validateCoinType(coinType)) {
		throw new PaymentKitUriError('Invalid URI: Coin Type is not valid');
	}

	if (!validateNonce(nonce)) {
		throw new PaymentKitUriError('Invalid URI: Nonce length exceeds maximum of 36 characters');
	}

	// Validate amount is a valid numeric string (int or float) and positive
	const bigIntAmount = BigInt(amount);
	if (!validateAmount(bigIntAmount)) {
		throw new PaymentKitUriError('Invalid URI: Amount must be a positive number');
	}

	// Extract optional registry parameter
	const registry = params.get('registry') || undefined;

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
		receiverAddress: address,
		amount: bigIntAmount,
		coinType,
		nonce: nonce,
		label: params.get('label') ? params.get('label')! : undefined,
		message: params.get('message') ? params.get('message')! : undefined,
		iconUrl: params.get('icon') ? params.get('icon')! : undefined,
	};

	if (registryId) {
		return { ...baseParams, registryId };
	}

	return { ...baseParams, registryName };
};
