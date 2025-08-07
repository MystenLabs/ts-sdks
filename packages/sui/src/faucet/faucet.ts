// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export class FaucetRateLimitError extends Error {}

type FaucetCoinInfo = {
	amount: number;
	id: string;
	transferTxDigest: string;
};

type FaucetResponse = {
	transferredGasObjects: FaucetCoinInfo[];
	error?: string | null;
};

type BatchFaucetResponse = {
	task?: string | null;
	error?: string | null;
};

type BatchSendStatusType = {
	status: 'INPROGRESS' | 'SUCCEEDED' | 'DISCARDED';
	transferred_gas_objects: { sent: FaucetCoinInfo[] };
};

type BatchStatusFaucetResponse = {
	status: BatchSendStatusType;
	error?: string | null;
};

type FaucetResponseV2 = {
	status: 'Success' | FaucetFailure;
	coins_sent: FaucetCoinInfo[] | null;
};

type FaucetFailure = {
	Failure: {
		internal: string;
	};
};

type FaucetRequest = {
	host: string;
	path: string;
	body?: Record<string, any>;
	headers?: HeadersInit;
	method: 'GET' | 'POST';
};

async function faucetRequest<T>({ host, path, body, headers, method }: FaucetRequest): Promise<T> {
	const endpoint = new URL(path, host).toString();
	const res = await fetch(endpoint, {
		method,
		body: body ? JSON.stringify(body) : undefined,
		headers: {
			'Content-Type': 'application/json',
			...(headers || {}),
		},
	});

	if (res.status === 429) {
		throw new FaucetRateLimitError(
			`Too many requests from this client have been sent to the faucet. Please retry later`,
		);
	}

	try {
		const parsed = await res.json();
		return parsed as T;
	} catch (e) {
		throw new Error(
			`Encountered error when parsing response from faucet, error: ${e}, status ${res.status}, response ${res}`,
		);
	}
}

/**
 * @deprecated("Use requestSuiFromFaucetV2 instead")
 */
export async function requestSuiFromFaucetV0(input: {
	host: string;
	recipient: string;
	headers?: HeadersInit;
}): Promise<FaucetResponse> {
	const response = await faucetRequest<FaucetResponse>({
		host: input.host,
		path: '/gas',
		body: {
			FixedAmountRequest: {
				recipient: input.recipient,
			},
		},
		headers: input.headers,
		method: 'POST',
	});

	if (response.error) {
		throw new Error(`Faucet request failed: ${response.error}`);
	}

	return response;
}

/**
 * @deprecated("Use requestSuiFromFaucetV2 instead")
 */
export async function requestSuiFromFaucetV1(input: {
	host: string;
	recipient: string;
	headers?: HeadersInit;
}): Promise<BatchFaucetResponse> {
	const response = await faucetRequest<BatchFaucetResponse>({
		host: input.host,
		path: '/v1/gas',
		body: {
			FixedAmountRequest: {
				recipient: input.recipient,
			},
		},
		headers: input.headers,
		method: 'POST',
	});

	if (response.error) {
		throw new Error(`Faucet request failed: ${response.error}`);
	}

	return response;
}

export async function requestSuiFromFaucetV2(input: {
	host: string;
	recipient: string;
	headers?: HeadersInit;
}) {
	const response = await faucetRequest<FaucetResponseV2>({
		host: input.host,
		path: '/v2/gas',
		body: {
			FixedAmountRequest: {
				recipient: input.recipient,
			},
		},
		headers: input.headers,
		method: 'POST',
	});

	if (response.status !== 'Success') {
		throw new Error(`Faucet request failed: ${response.status.Failure.internal}`);
	}

	return response;
}

/**
 * @deprecated("Use requestSuiFromFaucetV2 which returns directly a success or failure status")
 */
export async function getFaucetRequestStatus(input: {
	host: string;
	taskId: string;
	headers?: HeadersInit;
}) {
	const response = await faucetRequest<BatchStatusFaucetResponse>({
		host: input.host,
		path: `/v1/status/${input.taskId}`,
		headers: input.headers,
		method: 'GET',
	});

	if (response.error) {
		throw new Error(`Faucet request failed: ${response.error}`);
	}

	return response;
}

export function getFaucetHost(network: 'testnet' | 'devnet' | 'localnet') {
	switch (network) {
		case 'testnet':
			return 'https://faucet.testnet.sui.io';
		case 'devnet':
			return 'https://faucet.devnet.sui.io';
		case 'localnet':
			return 'http://127.0.0.1:9123';
		default:
			throw new Error(`Unknown network: ${network}`);
	}
}
