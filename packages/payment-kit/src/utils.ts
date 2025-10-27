// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { deriveObjectID, isValidSuiAddress, isValidSuiObjectId } from '@mysten/sui/utils';
import { DEFAULT_REGISTRY_NAME, SUI_PROTOCOL } from './constants.js';
import type { PaymentUriParams } from './types.js';
import { PaymentKitUriError } from './error.js';

export const getRegistryIdFromName = (
	registryName: string = DEFAULT_REGISTRY_NAME,
	namespaceId: string,
) => {
	return deriveObjectID(
		namespaceId,
		'0x1::ascii::String',
		bcs.String.serialize(registryName).toBytes(),
	);
};

const validateNonce = (nonce: string) => {
	return nonce.length <= 36;
};

const validateAmount = (amount: bigint) => {
	return amount > 0n;
};

export const createUri = (params: PaymentUriParams): string => {
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

	uri.searchParams.append('coinType', coinType);

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
		uri.searchParams.append('label', encodeURIComponent(params.label));
	}

	if (params.message) {
		uri.searchParams.append('message', encodeURIComponent(params.message));
	}

	if (params.iconUrl) {
		uri.searchParams.append('iconUrl', encodeURIComponent(params.iconUrl));
	}

	return uri.toString();
};

export const parseUri = (uri: string): PaymentUriParams => {
	const decodedUri = decodeURI(uri);

	if (!decodedUri.startsWith('sui:')) {
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
		nonce,
		label: params.get('label') ? decodeURIComponent(params.get('label')!) : undefined,
		message: params.get('message') ? decodeURIComponent(params.get('message')!) : undefined,
		iconUrl: params.get('icon') ? decodeURIComponent(params.get('icon')!) : undefined,
	};

	if (registryId) {
		return { ...baseParams, registryId };
	}

	return { ...baseParams, registryName };
};
