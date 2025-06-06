// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta = {
	title: 'Connect Modal',
	component: 'mysten-dapp-kit-connect-modal',
	render: (args) => html`
		<mysten-dapp-kit-connect-modal ?open="${args['open']}"></mysten-dapp-kit-connect-modal>
	`,
	tags: ['autodocs'],
} satisfies Meta;

export default meta;

export const Default: StoryObj = {
	args: {
		open: true,
	},
};
