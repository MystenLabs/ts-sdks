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

export const WithCustomLabel: StoryObj = {
	render: () => html`<mysten-dapp-kit-connect-button>Sign In</mysten-dapp-kit-connect-button>`,
};

export const WithCustomTheme: StoryObj = {
	render: () => html`
		<div>
			<style>
				:root {
					--background: oklch(0.141 0.005 285.823);
					--foreground: oklch(0.985 0 0);
					--card: oklch(0.21 0.006 285.885);
					--card-foreground: oklch(0.985 0 0);
					--popover: oklch(0.21 0.006 285.885);
					--popover-foreground: oklch(0.985 0 0);
					--primary: oklch(0.541 0.281 293.009);
					--primary-foreground: oklch(0.969 0.016 293.756);
					--secondary: oklch(0.274 0.006 286.033);
					--secondary-foreground: oklch(0.985 0 0);
					--muted: oklch(0.274 0.006 286.033);
					--muted-foreground: oklch(0.705 0.015 286.067);
					--accent: oklch(0.274 0.006 286.033);
					--accent-foreground: oklch(0.985 0 0);
					--destructive: oklch(0.704 0.191 22.216);
					--border: oklch(1 0 0 / 10%);
					--input: oklch(1 0 0 / 15%);
					--ring: oklch(0.541 0.281 293.009);
				}
			</style>
			<mysten-dapp-kit-connect-button>Sign In</mysten-dapp-kit-connect-button>
		</div>
	`,
};
