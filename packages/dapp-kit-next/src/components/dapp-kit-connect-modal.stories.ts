// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import type { DAppKitConnectModal } from './dapp-kit-connect-modal.js';

const meta = {
	title: 'Connect Modal',
	component: 'mysten-dapp-kit-connect-modal',
	render: (args) => html`
		<mysten-dapp-kit-connect-modal
			?open="${args['open']}"
			.sort=${args['sort']}
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
