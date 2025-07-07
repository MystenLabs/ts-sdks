// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import type { DAppKitConnectModal } from './dapp-kit-connect-modal.js';
import { createDAppKit } from '../core/index.js';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

const dAppKit = createDAppKit({
	networks: ['testnet'],
	createClient(network) {
		return new SuiClient({ network, url: getFullnodeUrl(network) });
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
			.installableWallets=${args['installableWallets']}
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

export const InstallableWallets: StoryObj<DAppKitConnectModal> = {
	args: {
		open: true,
		installableWallets: [
			{
				name: 'Slush',
				icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjNENBMkZGIi8+CjxwYXRoIGQ9Ik0xMi4zNDczIDM0LjcyNTRDMTMuNTU1MyAzOS4yMzM2IDE4LjA2NzMgNDMuMzE0OCAyNy40MDI1IDQwLjgxMzRDMzYuMzA5NyAzOC40MjY3IDQxLjg5MjEgMzEuMDk5MyA0MC40NDQ2IDI1LjY5NzJDMzkuOTQ0NyAyMy44MzE3IDM4LjQzOTEgMjIuNTY4OSAzNi4xMTc4IDIyLjc3NDRMMTUuMzYxNSAyNC41MDM4QzE0LjA1NDQgMjQuNjA0MSAxMy40NTUgMjQuMzg5OCAxMy4xMDkyIDIzLjU2NjFDMTIuNzczOCAyMi43ODEyIDEyLjk2NDkgMjEuOTM4NSAxNC41NDM3IDIxLjE0MDZMMzAuMzM5NiAxMy4wMzQyQzMxLjU1MDMgMTIuNDE4MiAzMi4zNTY3IDEyLjE2MDUgMzMuMDkzNiAxMi40MjEzQzMzLjU1NTUgMTIuNTg5MSAzMy44NTk2IDEzLjI1NzQgMzMuNTgwMyAxNC4wODJMMzIuNTU2MSAxNy4xMDU2QzMxLjI5OTIgMjAuODE2NCAzMy45ODk5IDIxLjY3ODQgMzUuNTA2OCAyMS4yNzE5QzM3LjgwMTcgMjAuNjU3IDM4LjM0MTYgMTguNDcxMiAzNy42MDIzIDE1LjcxMTlDMzUuNzI3OCA4LjcxNjI5IDI4LjMwNTkgNy42MjI1NCAyMS41NzY4IDkuNDI1NTlDMTQuNzMxMSAxMS4yNTk5IDguNzk2ODEgMTYuODA3MiAxMC42MDg4IDIzLjU2OTZDMTEuMDM1OCAyNS4xNjMgMTIuNTAyNSAyNi40MzYyIDE0LjIwMTQgMjYuMzk3NUwxNi43OTUgMjYuMzkxMkMxNy4zMjg0IDI2LjM3ODggMTcuMTM2MyAyNi40MjI3IDE4LjE2NTMgMjYuMzM3NEMxOS4xOTQ0IDI2LjI1MjIgMjEuOTQyNSAyNS45MTQgMjEuOTQyNSAyNS45MTRMMzUuNDI3NSAyNC4zODhMMzUuNzc1IDI0LjMzNzVDMzYuNTYzNyAyNC4yMDMgMzcuMTU5NyAyNC40MDc5IDM3LjY2MzYgMjUuMjc2QzM4LjQxNzcgMjYuNTc1IDM3LjI2NzIgMjcuNTU0NiAzNS44ODk5IDI4LjcyNzJDMzUuODUzIDI4Ljc1ODYgMzUuODE2IDI4Ljc5MDEgMzUuNzc4OSAyOC44MjE4TDIzLjkyNSAzOS4wMzc3QzIxLjg5MzMgNDAuNzkwMSAyMC40NjYgNDAuMTMxMSAxOS45NjYyIDM4LjI2NTZMMTguMTk1OCAzMS42NTg3QzE3Ljc1ODUgMzAuMDI2NCAxNi4xNjQ2IDI4Ljc0NTYgMTQuMjk3NiAyOS4yNDU5QzExLjk2MzggMjkuODcxMiAxMS43NzQ2IDMyLjU4NzggMTIuMzQ3MyAzNC43MjU0WiIgZmlsbD0iIzA2MEQxNCIvPgo8L3N2Zz4K',
				installUrl: 'https://slush.app/download',
			},
			{
				name: 'Phantom',
				icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTA4IiBoZWlnaHQ9IjEwOCIgdmlld0JveD0iMCAwIDEwOCAxMDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiByeD0iMjYiIGZpbGw9IiNBQjlGRjIiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik00Ni41MjY3IDY5LjkyMjlDNDIuMDA1NCA3Ni44NTA5IDM0LjQyOTIgODUuNjE4MiAyNC4zNDggODUuNjE4MkMxOS41ODI0IDg1LjYxODIgMTUgODMuNjU2MyAxNSA3NS4xMzQyQzE1IDUzLjQzMDUgNDQuNjMyNiAxOS44MzI3IDcyLjEyNjggMTkuODMyN0M4Ny43NjggMTkuODMyNyA5NCAzMC42ODQ2IDk0IDQzLjAwNzlDOTQgNTguODI1OCA4My43MzU1IDc2LjkxMjIgNzMuNTMyMSA3Ni45MTIyQzcwLjI5MzkgNzYuOTEyMiA2OC43MDUzIDc1LjEzNDIgNjguNzA1MyA3Mi4zMTRDNjguNzA1MyA3MS41NzgzIDY4LjgyNzUgNzAuNzgxMiA2OS4wNzE5IDY5LjkyMjlDNjUuNTg5MyA3NS44Njk5IDU4Ljg2ODUgODEuMzg3OCA1Mi41NzU0IDgxLjM4NzhDNDcuOTkzIDgxLjM4NzggNDUuNjcxMyA3OC41MDYzIDQ1LjY3MTMgNzQuNDU5OEM0NS42NzEzIDcyLjk4ODQgNDUuOTc2OCA3MS40NTU2IDQ2LjUyNjcgNjkuOTIyOVpNODMuNjc2MSA0Mi41Nzk0QzgzLjY3NjEgNDYuMTcwNCA4MS41NTc1IDQ3Ljk2NTggNzkuMTg3NSA0Ny45NjU4Qzc2Ljc4MTYgNDcuOTY1OCA3NC42OTg5IDQ2LjE3MDQgNzQuNjk4OSA0Mi41Nzk0Qzc0LjY5ODkgMzguOTg4NSA3Ni43ODE2IDM3LjE5MzEgNzkuMTg3NSAzNy4xOTMxQzgxLjU1NzUgMzcuMTkzMSA4My42NzYxIDM4Ljk4ODUgODMuNjc2MSA0Mi41Nzk0Wk03MC4yMTAzIDQyLjU3OTVDNzAuMjEwMyA0Ni4xNzA0IDY4LjA5MTYgNDcuOTY1OCA2NS43MjE2IDQ3Ljk2NThDNjMuMzE1NyA0Ny45NjU4IDYxLjIzMyA0Ni4xNzA0IDYxLjIzMyA0Mi41Nzk1QzYxLjIzMyAzOC45ODg1IDYzLjMxNTcgMzcuMTkzMSA2NS43MjE2IDM3LjE5MzFDNjguMDkxNiAzNy4xOTMxIDcwLjIxMDMgMzguOTg4NSA3MC4yMTAzIDQyLjU3OTVaIiBmaWxsPSIjRkZGREY4Ii8+Cjwvc3ZnPgo=',
				installUrl: 'https://phantom.com/download',
			},
		],
	},
};

export const NoDetectedWallets: StoryObj<DAppKitConnectModal> = {
	args: {
		open: true,
		filterFn: () => false,
	},
};
