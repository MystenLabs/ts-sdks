// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DevWallet } from '../wallet/dev-wallet.js';
import './dev-wallet-panel.js';

/**
 * Mount the dev wallet UI to the document.
 *
 * Creates a `<dev-wallet-panel>` element, attaches the wallet instance,
 * and appends it to the target container (defaults to `document.body`).
 *
 * @returns A cleanup function that removes the element from the DOM.
 */
export function mountDevWallet(
	wallet: DevWallet,
	options?: { container?: HTMLElement },
): () => void {
	const container = options?.container ?? document.body;

	const panel = document.createElement('dev-wallet-panel');
	panel.wallet = wallet;
	container.appendChild(panel);

	return () => {
		panel.remove();
	};
}
