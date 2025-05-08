// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { IdentifierString, WalletAccount } from '@wallet-standard/core';

/** Name of the feature. */
export const SuiSignPersonalMessage = 'sui:signPersonalMessage';

/** The latest API version of the signPersonalMessage API. */
export type SuiSignPersonalMessageVersion = '1.1.0';

/**
 * A Wallet Standard feature for signing a personal message, and returning the
 * message bytes that were signed, and message signature.
 */
export type SuiSignPersonalMessageFeature = {
	/** Namespace for the feature. */
	[SuiSignPersonalMessage]: {
		/** Version of the feature API. */
		version: SuiSignPersonalMessageVersion;
		signPersonalMessage: SuiSignPersonalMessageMethod;
	};
};

export type SuiSignPersonalMessageMethod = (
	input: SuiSignPersonalMessageInput,
) => Promise<SuiSignPersonalMessageOutput>;

/** Input for signing personal messages. */
export interface SuiSignPersonalMessageInput {
	message: Uint8Array;
	account: WalletAccount;
	chain?: IdentifierString;
}

/** Output of signing personal messages. */
export interface SuiSignPersonalMessageOutput extends SignedPersonalMessage {}

export interface SignedPersonalMessage {
	/** Base64 encoded message bytes */
	bytes: string;
	/** Base64 encoded signature */
	signature: string;
}
