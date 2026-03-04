// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import { createJwtSession, WalletPostMessageChannel } from '@mysten/window-wallet-core';

import type { SignerAdapter } from '../types.js';
import { executeSigning } from '../wallet/signing.js';

/**
 * A parsed wallet request with methods to approve or reject it.
 *
 * This is different from `PendingSigningRequest` (in dev-wallet.ts) — this interface
 * includes `approve()`/`reject()` methods and is specific to the standalone popup flow.
 */
export interface PendingWalletRequest {
	type: 'connect' | 'sign-transaction' | 'sign-and-execute-transaction' | 'sign-personal-message';
	appName: string;
	appUrl: string;
	address?: string;
	chain?: string;
	data?: string | Uint8Array;
	/**
	 * Approve the request.
	 * For connect: creates a session with the selected accounts (or all if none specified).
	 * For signing: signs with the adapter.
	 */
	approve(options?: { selectedAddresses?: string[] }): Promise<void>;
	/** Reject the request with an optional reason. */
	reject(reason?: string): void;
}

export interface HandleRequestOptions {
	/** The signer adapters providing accounts and signing capability. */
	adapters: SignerAdapter[];
	/** JWT secret key for session creation. */
	jwtSecretKey: CryptoKey | Uint8Array;
	/** SuiClient instances by network (needed for signAndExecute). */
	clients?: Record<string, ClientWithCoreApi>;
	/** URL hash containing the encoded request. Defaults to window.location.hash. */
	hash?: string;
}

/**
 * Parse an incoming wallet request from the URL hash and return
 * a `PendingWalletRequest` with approve/reject methods.
 *
 * This is the core handler for a web wallet app that receives
 * PostMessage requests from dApps via `DevWalletClient`.
 *
 * @example
 * ```typescript
 * const request = parseWalletRequest({
 *   adapters: [adapter],
 *   jwtSecretKey: secretKey,
 * });
 *
 * // Show approval UI...
 * // On user approval:
 * await request.approve();
 * window.close();
 * ```
 */
export function parseWalletRequest(options: HandleRequestOptions): PendingWalletRequest {
	if (!options.hash && typeof window === 'undefined') {
		throw new Error(
			'parseWalletRequest requires either options.hash or a browser environment with window.location',
		);
	}
	const hash = options.hash ?? window.location.hash.slice(1);
	const channel = WalletPostMessageChannel.fromUrlHash(hash);
	const requestData = channel.getRequestData();
	const payload = requestData.payload;

	if (payload.type === 'connect') {
		return {
			type: 'connect',
			appName: requestData.appName,
			appUrl: requestData.appUrl,
			async approve(approveOptions?: { selectedAddresses?: string[] }) {
				const allAccounts = options.adapters.flatMap((adapter) =>
					adapter.getAccounts().map((a) => ({
						address: a.address,
						publicKey: toBase64(a.signer.getPublicKey().toSuiBytes()),
						label: a.label,
					})),
				);
				const selected = approveOptions?.selectedAddresses;
				const accounts = selected
					? allAccounts.filter((a) => selected.includes(a.address))
					: allAccounts;

				const session = await createJwtSession(
					{ accounts },
					{
						secretKey: options.jwtSecretKey,
						expirationTime: '7d',
						issuer: 'dev-wallet',
						audience: new URL(requestData.appUrl).origin,
					},
				);

				channel.sendMessage({
					type: 'resolve',
					data: { type: 'connect', session },
				});
			},
			reject(reason?: string) {
				channel.sendMessage({ type: 'reject', reason });
			},
		};
	}

	const messageData =
		payload.type === 'sign-personal-message' ? fromBase64(payload.message) : payload.transaction;

	return {
		type: payload.type,
		appName: requestData.appName,
		appUrl: requestData.appUrl,
		address: payload.address,
		chain: payload.chain,
		data: messageData,
		async approve() {
			// Verify JWT session before signing — ensures the dApp was previously
			// authorized for this account via a connect flow
			try {
				await channel.verifyJwtSession(options.jwtSecretKey);
			} catch (error) {
				channel.sendMessage({
					type: 'reject',
					reason: `Session verification failed: ${error instanceof Error ? error.message : String(error)}`,
				});
				return;
			}

			let account;
			for (const adapter of options.adapters) {
				account = adapter.getAccount(payload.address);
				if (account) break;
			}
			if (!account) {
				channel.sendMessage({
					type: 'reject',
					reason: `Account ${payload.address} not found`,
				});
				return;
			}

			try {
				const network = payload.chain?.split(':')[1];
				const client = network ? options.clients?.[network] : undefined;
				const result = await executeSigning({
					type: payload.type,
					signer: account.signer,
					data: messageData,
					client,
				});
				// Normalize effects to always be a string for the PostMessage channel protocol
				const data =
					result.type === 'sign-and-execute-transaction'
						? { ...result, effects: result.effects ?? '' }
						: result;
				channel.sendMessage({
					type: 'resolve',
					data,
				});
			} catch (error) {
				channel.sendMessage({
					type: 'reject',
					reason: error instanceof Error ? error.message : String(error),
				});
			}
		},
		reject(reason?: string) {
			channel.sendMessage({ type: 'reject', reason });
		},
	};
}
