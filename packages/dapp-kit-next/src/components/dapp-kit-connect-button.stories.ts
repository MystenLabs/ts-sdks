// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta = {
	title: 'Connect Button',
	component: 'mysten-dapp-kit-connect-button',
	render: () => html`<mysten-dapp-kit-connect-button></mysten-dapp-kit-connect-button>`,
	tags: ['autodocs'],
} satisfies Meta;

export default meta;

export const Default: StoryObj = {};
