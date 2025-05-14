// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

import '../components/dapp-kit-connect-modal.js';

const meta = {
	title: 'Connect Modal',
	component: 'mysten-dapp-kit-connect-modal',
	render: () => html`<mysten-dapp-kit-connect-modal></mysten-dapp-kit-connect-modal>`,
	tags: ['autodocs'],
} satisfies Meta;

export default meta;

export const Default: StoryObj = {};
