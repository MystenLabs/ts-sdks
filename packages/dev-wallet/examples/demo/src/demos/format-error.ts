// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Format wallet errors into user-friendly messages. */
export function formatWalletError(err: unknown): string {
	const message = err instanceof Error ? err.message : String(err);

	if (message.includes('rejected by user') || message.includes('Request rejected')) {
		return 'Request was rejected.';
	}
	if (message.includes('already pending')) {
		return 'Another signing request is already in progress. Please wait for it to complete.';
	}
	if (message.includes('Insufficient')) {
		return 'Insufficient balance. Request SUI from the faucet first.';
	}
	if (message.includes('Wallet has been destroyed')) {
		return 'Wallet was disconnected. Please reconnect.';
	}

	return message;
}
