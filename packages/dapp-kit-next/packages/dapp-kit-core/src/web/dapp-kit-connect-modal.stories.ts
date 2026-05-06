// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import type { TemplateResult } from 'lit';
import type { DAppKitConnectModal, DAppKitConnectModalOptions } from './dapp-kit-connect-modal.js';
import { createDAppKit } from '../core/index.js';
import { SuiGrpcClient } from '@mysten/sui/grpc';

const GRPC_URLS = {
	testnet: 'https://fullnode.testnet.sui.io:443',
};

const dAppKit = createDAppKit({
	networks: ['testnet'],
	createClient(network) {
		return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
	},
});

type ConnectModalStoryArgs = {
	open?: boolean;
	sortFn?: DAppKitConnectModalOptions['sortFn'];
	filterFn?: DAppKitConnectModalOptions['filterFn'];
};

const meta: Meta<ConnectModalStoryArgs> = {
	title: 'Connect Modal',
	component: 'mysten-dapp-kit-connect-modal',
	render: (args: ConnectModalStoryArgs): TemplateResult => html`
		<mysten-dapp-kit-connect-modal
			?open="${args.open}"
			.sortFn=${args.sortFn}
			.filterFn=${args.filterFn}
			.instance=${dAppKit}
		></mysten-dapp-kit-connect-modal>
	`,
	tags: ['autodocs'],
} satisfies Meta<ConnectModalStoryArgs>;

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
