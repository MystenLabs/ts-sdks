// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKitStores } from '../store.js';
import type { Networks } from '../../utils/networks.js';

export type SwitchNetworkArgs<TNetworks extends Networks> = {
	/** The network to switch to. */
	network: TNetworks[number];
};

export function switchNetworkCreator<TNetworks extends Networks>({
	$currentNetwork,
}: DAppKitStores<TNetworks>) {
	/**
	 * Switches the currently selected network to the specified network.
	 */
	return function switchNetwork({ network }: SwitchNetworkArgs<TNetworks>) {
		$currentNetwork.set(network);
	};
}
