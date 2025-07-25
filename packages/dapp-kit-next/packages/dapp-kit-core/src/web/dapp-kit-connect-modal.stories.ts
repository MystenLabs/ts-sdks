// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import type { DAppKitConnectModal } from './dapp-kit-connect-modal.js';
import { createDAppKit } from '../core/index.js';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

const dAppKit = createDAppKit({
	networks: ['testnet'],
	walletConnectProjectId: '702e2d45d9debca66795614cddb5c1ca',
	createClient(network) {
		return new SuiClient({ network, url: getFullnodeUrl(network), });
	},
});

const meta = {
	title: 'Connect Modal',
	component: 'mysten-dapp-kit-connect-modal',
	render: (args) => html`
		<mysten-dapp-kit-connect-modal
			?open="${args['open']}"
			.sortFn=${args['sortFn']}
			.filterFn=${args['filterFn']}
			.instance=${dAppKit}
		></mysten-dapp-kit-connect-modal>
	`,
	tags: ['autodocs'],
} satisfies Meta;

export default meta;

export const Default: StoryObj<DAppKitConnectModal> = {
	args: {
		open: true,
	},
};

export const WithRandomSort: StoryObj<DAppKitConnectModal> = {
	args: {
		open: true,
		sortFn: () => 0.5 - Math.random(),
	},
};

export const WithRandomFilter: StoryObj<DAppKitConnectModal> = {
	args: {
		open: true,
		filterFn: () => Math.random() > 0.5,
	},
};

export const NoDetectedWallets: StoryObj<DAppKitConnectModal> = {
	args: {
		open: true,
		filterFn: () => false,
	},
};
