// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { style } from '@vanilla-extract/css';

import { themeVars } from '../../../themes/themeContract.js';

export const container: string = style({
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'center',
	alignItems: 'center',
	width: '100%',
});

export const walletIcon: string = style({
	objectFit: 'cover',
	width: 72,
	height: 72,
	borderRadius: themeVars.radii.large,
});

export const title: string = style({
	marginTop: 12,
});

export const connectionStatus: string = style({
	marginTop: 4,
});

export const retryButtonContainer: string = style({
	position: 'absolute',
	bottom: 20,
	right: 20,
});
