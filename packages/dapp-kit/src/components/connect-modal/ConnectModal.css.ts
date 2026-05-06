// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { style } from '@vanilla-extract/css';

import { themeVars } from '../../themes/themeContract.js';

export const overlay: string = style({
	backgroundColor: themeVars.backgroundColors.modalOverlay,
	backdropFilter: themeVars.blurs.modalOverlay,
	position: 'fixed',
	inset: 0,
	zIndex: 999999999,
});

export const title: string = style({
	paddingLeft: 8,
});

export const content: string = style({
	backgroundColor: themeVars.backgroundColors.modalPrimary,
	borderRadius: themeVars.radii.xlarge,
	color: themeVars.colors.body,
	position: 'fixed',
	bottom: 16,
	left: 16,
	right: 16,
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'space-between',
	overflow: 'hidden',
	minHeight: '50vh',
	maxHeight: '85vh',
	maxWidth: 700,
	'@media': {
		'screen and (min-width: 768px)': {
			flexDirection: 'row',
			width: '100%',
			top: '50%',
			left: '50%',
			transform: 'translate(-50%, -50%)',
		},
	},
});

export const whatIsAWalletButton: string = style({
	backgroundColor: themeVars.backgroundColors.modalSecondary,
	padding: 16,
	'@media': {
		'screen and (min-width: 768px)': {
			display: 'none',
		},
	},
});

export const viewContainer: string = style({
	display: 'none',
	padding: 20,
	flexGrow: 1,
	'@media': {
		'screen and (min-width: 768px)': {
			display: 'flex',
		},
	},
});

export const selectedViewContainer: string = style({
	display: 'flex',
});

export const backButtonContainer: string = style({
	position: 'absolute',
	top: 20,
	left: 20,
	'@media': {
		'screen and (min-width: 768px)': {
			display: 'none',
		},
	},
});

export const closeButtonContainer: string = style({
	position: 'absolute',
	top: 16,
	right: 16,
});

export const walletListContent: string = style({
	display: 'flex',
	flexDirection: 'column',
	flexGrow: 1,
	gap: 24,
	padding: 20,
	backgroundColor: themeVars.backgroundColors.modalPrimary,
	'@media': {
		'screen and (min-width: 768px)': {
			backgroundColor: themeVars.backgroundColors.modalSecondary,
		},
	},
});

export const walletListContainer: string = style({
	display: 'flex',
	justifyContent: 'space-between',
	flexDirection: 'column',
	flexGrow: 1,
	'@media': {
		'screen and (min-width: 768px)': {
			flexDirection: 'row',
			flexBasis: 240,
			flexGrow: 0,
			flexShrink: 0,
		},
	},
});

export const walletListContainerWithViewSelected: string = style({
	display: 'none',
	'@media': {
		'screen and (min-width: 768px)': {
			display: 'flex',
		},
	},
});
