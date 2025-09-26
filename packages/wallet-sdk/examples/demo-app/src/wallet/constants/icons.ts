// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Demo Wallet Icons
 * Avatar generators for wallet and account icons
 */

// Demo Wallet icon - fixed hexagon design for wallet branding
export const DEMO_WALLET_ICON =
	'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gPHBhdGggZD0iTTI0IDJMNDIgMTJWMzZMMjQgNDZMNiAzNlYxMkwyNCAyWiIgZmlsbD0iIzRkYTJmZiIvPiA8cmVjdCB4PSIxMiIgeT0iMTYiIHdpZHRoPSIyNCIgaGVpZ2h0PSIxNiIgcng9IjMiIGZpbGw9IndoaXRlIi8+IDxyZWN0IHg9IjEyIiB5PSIxNiIgd2lkdGg9IjI0IiBoZWlnaHQ9IjUiIHJ4PSIzIiBmaWxsPSIjMjE5NkYzIi8+IDxyZWN0IHg9IjI4IiB5PSIyMiIgd2lkdGg9IjYiIGhlaWdodD0iNCIgcng9IjEuNSIgZmlsbD0iIzRkYTJmZiIvPiA8Y2lyY2xlIGN4PSIzMSIgY3k9IjI0IiByPSIxIiBmaWxsPSJ3aGl0ZSIvPiA8L3N2Zz4=' as const;

/**
 * Generate a unique account avatar URL using Robohash
 * @param address - The wallet address to use as seed
 * @returns Avatar URL
 */
export function getAccountAvatarUrl(address: string): string {
	// Use Robohash set 3 (geometric robots) with the address as seed
	return `https://robohash.org/${address}?set=set3&size=48x48&bgset=bg1`;
}
