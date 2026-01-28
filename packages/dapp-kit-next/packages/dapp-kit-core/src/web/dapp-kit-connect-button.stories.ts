// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import type { DAppKitConnectButton } from './dapp-kit-connect-button.js';
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

const meta = {
	title: 'Connect Button',
	component: 'mysten-dapp-kit-connect-button',
	render: (args) =>
		html`<mysten-dapp-kit-connect-button
			.modalOptions=${args['modalOptions']}
			.instance=${dAppKit}
		></mysten-dapp-kit-connect-button>`,
	tags: ['autodocs'],
} satisfies Meta;

export default meta;

export const Default: StoryObj<DAppKitConnectButton> = {};

export const WithCustomLabel: StoryObj<DAppKitConnectButton> = {
	render: () =>
		html`<mysten-dapp-kit-connect-button .instance=${dAppKit}>
			Sign In
		</mysten-dapp-kit-connect-button>`,
};

export const WithCustomTheme: StoryObj<DAppKitConnectButton> = {
	render: () => html`
		<div>
			<style>
				:root {
					--background: oklch(0.2161 0.0061 56.0434);
					--foreground: oklch(0.9299 0.0334 272.7879);
					--card: oklch(0.2805 0.0309 307.2326);
					--card-foreground: oklch(0.9299 0.0334 272.7879);
					--primary: oklch(0.7874 0.1179 295.7538);
					--primary-foreground: oklch(0.2161 0.0061 56.0434);
					--secondary: oklch(0.3416 0.0444 308.8496);
					--secondary-foreground: oklch(0.8717 0.0093 258.3382);
					--muted: oklch(0.2805 0.0309 307.2326);
					--muted-foreground: oklch(0.7137 0.0192 261.3246);
					--accent: oklch(0.3858 0.0509 304.6383);
					--accent-foreground: oklch(0.8717 0.0093 258.3382);
					--popover: oklch(0.2284 0.0384 282.9324);
					--popover-foreground: oklch(0.9185 0.0257 285.8834);
					--border: oklch(0.3416 0.0444 308.8496);
					--input: oklch(0.3416 0.0444 308.8496);
					--ring: oklch(0.7874 0.1179 295.7538);
					--font-sans: Open Sans, sans-serif;
					--radius: 1.5rem;
				}
			</style>
			<mysten-dapp-kit-connect-button .instance=${dAppKit}></mysten-dapp-kit-connect-button>
		</div>
	`,
};

export const WithRandomSort: StoryObj<DAppKitConnectButton> = {
	args: {
		modalOptions: {
			sortFn: () => 0.5 - Math.random(),
		},
	},
};

export const WithRandomFilter: StoryObj<DAppKitConnectButton> = {
	args: {
		modalOptions: {
			filterFn: () => Math.random() > 0.5,
		},
	},
};
